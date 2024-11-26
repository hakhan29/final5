const video = document.getElementById('video');
const expressionDiv = document.getElementById('expression');

// 모델 파일 로드
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    // 직사각형 캔버스 생성
    const rectCanvas = document.createElement('canvas');
    rectCanvas.width = 400; // 가로 길이 (세로의 2배)
    rectCanvas.height = 200; // 세로 길이
    rectCanvas.style.position = 'absolute';
    rectCanvas.style.top = '50%';
    rectCanvas.style.left = '50%';
    rectCanvas.style.transform = 'translate(-50%, -50%)'; // 가운데 정렬
    document.body.append(rectCanvas);
    const rectContext = rectCanvas.getContext('2d');

    // 감정 텍스트를 보여줄 Div
    const expressionDiv = document.createElement('div');
    expressionDiv.style.position = 'absolute';
    expressionDiv.style.top = 'calc(50% - 120px)'; // 직사각형 바로 위
    expressionDiv.style.left = '50%';
    expressionDiv.style.transform = 'translateX(-50%)';
    expressionDiv.style.textAlign = 'center';
    expressionDiv.style.fontSize = '24px';
    expressionDiv.style.color = 'white';
    expressionDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    expressionDiv.style.padding = '10px';
    expressionDiv.style.transition = 'opacity 0.5s';
    document.body.append(expressionDiv);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

    if (detections.length > 0) {
        const expressions = detections[0].expressions;

        // 감정 데이터 유효성 확인
        if (!expressions || Object.keys(expressions).length === 0) {
            expressionDiv.innerText = '감정 감지 중...';
            rectContext.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
            return;
        }

        // 감정을 비율로 정렬하여 가장 높은 감정 찾기
        const sortedExpressions = Object.entries(expressions)
            .sort(([, a], [, b]) => b - a);

        const [topEmotion, topValue] = sortedExpressions[0]; // 가장 높은 감정
        const colors = {
            anger: { r: 255, g: 0, b: 0 },        // 빨강
            happy: { r: 255, g: 255, b: 0 },      // 노랑
            sad: { r: 0, g: 0, b: 255 },          // 파랑
            neutral: { r: 255, g: 255, b: 255 },  // 흰색
            surprised: { r: 255, g: 165, b: 0 },  // 주황
            fear: { r: 128, g: 0, b: 128 }        // 보라
        };

        let mixedColor = { r: 0, g: 0, b: 0 };
        let totalWeight = 0;

        // 감정 색상 혼합
        for (const [emotion, value] of sortedExpressions) {
            const weight = value || 0;
            totalWeight += weight;
            const color = colors[emotion] || { r: 0, g: 0, b: 0 }; // 기본값
            mixedColor.r += color.r * weight;
            mixedColor.g += color.g * weight;
            mixedColor.b += color.b * weight;
        }

        if (totalWeight > 0) {
            mixedColor.r = Math.round(mixedColor.r / totalWeight);
            mixedColor.g = Math.round(mixedColor.g / totalWeight);
            mixedColor.b = Math.round(mixedColor.b / totalWeight);
        }

        const topColor = colors[topEmotion] || { r: 255, g: 255, b: 255 }; // 기본값

        // 그라데이션 생성
        const gradient = rectContext.createLinearGradient(0, 0, rectCanvas.width, 0);
        gradient.addColorStop(0, `rgb(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b})`);
        gradient.addColorStop(1, `rgb(${topColor.r}, ${topColor.g}, ${topColor.b})`);

        // 텍스트 업데이트
        expressionDiv.innerText = `${topEmotion.toUpperCase()}`;

        // 캔버스 초기화 및 그라데이션 채우기
        rectContext.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
        rectContext.fillStyle = gradient;
        rectContext.fillRect(0, 0, rectCanvas.width, rectCanvas.height);
    } else {
        // 감정이 감지되지 않을 때 초기화
        expressionDiv.innerText = '감정 감지 중...';
        rectContext.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
    }
}, 100);
