import {
    HandLandmarker,
    FilesetResolver,
    DrawingUtils,
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const INDEX_FINGER = [5, 6, 8];
const MIDDLE_FINGER = [9, 10, 12];
const RING_FINGER = [13, 14, 16];
const PINKY_FINGER = [17, 18, 20];
const THUMB = [0, 1, 4];

const DRAW_HAND = true;

class VideoGestures {
    private window: Window;
    private document: Document;
    private video: HTMLVideoElement;
    private canvasElement: HTMLCanvasElement;
    private canvasCtx: CanvasRenderingContext2D;
    private enableWebcamButton: HTMLButtonElement;
    private webcamRunning: boolean;
    private lastVideoTime: number;
    private results: any; // Replace with the correct type for `results` if available
    private runningMode: string;
    private handLandmarker: any; // Replace with the correct type for `handLandmarker` if available
  
    constructor(window: Window, document: Document) {
      this.window = window;
      this.document = document;
  
      // Element references
      this.video = this.document.getElementById("webcam") as HTMLVideoElement;
      this.canvasElement = this.document.getElementById(
        "gesture-canvas"
      ) as HTMLCanvasElement;
      this.canvasCtx = this.canvasElement.getContext(
        "2d"
      ) as CanvasRenderingContext2D;
      this.enableWebcamButton = this.document.getElementById(
        "enable-webcam-button"
      ) as HTMLButtonElement;
      this.audioSelect = document.querySelector('select#audioSource') as HTMLSelectElement;
      this.videoSelect = document.querySelector('select#videoSource') as HTMLSelectElement;
      this.audioSelect.onchange = () => this.getStream();
      this.videoSelect.onchange = () => this.getStream();

      // State variables
      this.webcamRunning = false;
      this.lastVideoTime = -1;
      this.results = undefined;
      this.runningMode = "VIDEO"; // Default running mode

      this.drawingUtils = new DrawingUtils(this.canvasCtx);

      this.enabled = false;
      this.aim = {x: 0, y: 0};
      this.aiming = false;
      this.firing = true;
      this.thumbUp = {0: false, 1: false, 2: false, 3: false, 4: false, 5: false};
      this.switching = false;
      this.gestureHands = [];
      
      this.enableWebcamButton = this.queryElement('enableWebcamButton');
      this.enableWebcamButton.style.hidden = true;
    
      this.enable();
    }

    private queryDomByKey(key:string) {
      return this.document.querySelector(this.queryElement(key));
    }

    private queryElement<T extends HTMLElement>(selectorKey: string): T {
      const selector = this.getDomSelectors()[selectorKey] || '#errors';
      const element = this.document.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found for selector: ${selector}`);
      }
      return element as T;
    }

    private getDomSelectors(): { [key: string]: string } {
      return {
        errors: '#errors',
        webcam: "#webcam",
        canvas: "#gesture-canvas",
        enableWebcamButton: "#enable-webcam-button",
        audioSource: "select#audioSource",
        videoSource: "select#videoSource",
      };
    }

    setSize(width, height) {
      this.canvasElement.style.width = `${width}px`;
      this.canvasElement.style.height = `${height}px`;
      this.canvasElement.width = width;
      this.canvasElement.height = height;
    }

    async enable() {
      if (this.enabled) {
        return;
      }
      this.enabled = true;
      const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
      },
      runningMode: this.runningMode,
      numHands: 6,
      });
  
      await this.getStream().then(() => this.getDevices()).then((deviceInfos) => this.gotDevices(deviceInfos));

      this.enableWebcamButton.style.hidden = false;
      this.enableWebcamButton.addEventListener("click", (e) => {
        this.enableCam(e);
      });  
    }


    private getDevices() {
        // AFAICT in Safari this only gets default devices until gUM is called :/
        return navigator.mediaDevices.enumerateDevices();
    }

    private gotDevices(deviceInfos) {
        this.window.deviceInfos = deviceInfos; // make available to console
        console.log('Available input and output devices:', deviceInfos);
        for (const deviceInfo of deviceInfos) {
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            if (deviceInfo.kind === 'audioinput') {
              option.text = deviceInfo.label || `Microphone ${this.audioSelect.length + 1}`;
              this.audioSelect.appendChild(option);
            } else if (deviceInfo.kind === 'videoinput') {
              option.text = deviceInfo.label || `Camera ${this.videoSelect.length + 1}`;
              this.videoSelect.appendChild(option);
            }
        }
    }

    private getStream() {
        if (this.window.stream) {
            this.window.stream.getTracks().forEach(track => {
            track.stop();
            });
        }
        const audioSource = this.audioSelect.value;
        const videoSource = this.videoSelect.value;
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
            video: {deviceId: videoSource ? {exact: videoSource} : undefined}
        };

        return navigator.mediaDevices.getUserMedia(constraints).
            then((stream) => {
              this.gotStream(stream);
              if (this.webcamRunning) {
                this.predictWebcam();
              }
            }).catch((error) => this.handleError(error));
    }

    private gotStream(stream) {
        this.window.stream = stream; // make stream available to console
        this.audioSelect.selectedIndex = [...this.audioSelect.options].
            findIndex(option => option.text === stream.getAudioTracks()[0].label);
        this.videoSelect.selectedIndex = [...this.videoSelect.options].
            findIndex(option => option.text === stream.getVideoTracks()[0].label);
        this.video.srcObject = stream;
    }

    private handleError(error) {
        console.error('Error: ', error);
    }
  
    private async enableCam(e:Event) {
      if (!this.handLandmarker) {
        console.log("Wait! handLandmarker not loaded yet.");
        this.enable();
        return;
      }
  
      this.webcamRunning = !this.webcamRunning;
      this.enableWebcamButton.innerText = this.webcamRunning
        ? "DISABLE PREDICTIONS"
        : "ENABLE PREDICTIONS";
  
      if (this.webcamRunning) {
        this.predictWebcam();
      }
    }
  
    private async predictWebcam() {

      // Switch running mode to VIDEO if necessary
      if (this.runningMode === "IMAGE") {
        this.runningMode = "VIDEO";
        await this.handLandmarker.setOptions({ runningMode: "VIDEO" });
      }
  
      const startTimeMs = this.window.performance.now();
  
      // Detect landmarks
      if (this.lastVideoTime !== this.video.currentTime) {
        this.lastVideoTime = this.video.currentTime;
        this.results = this.handLandmarker.detectForVideo(
          this.video,
          startTimeMs
        );
      }
  
      // Draw results on canvas
      this.canvasCtx.save();
      this.canvasCtx.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
  
      if (this.results?.landmarks.length) {
        if (DRAW_HAND) {
          for (const landmarks of this.results.landmarks) {
            const flipped = this.flipLandmarks(landmarks)
            this.drawingUtils.drawConnectors(flipped, HandLandmarker.HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 5
            });
            this.drawingUtils.drawLandmarks(flipped, { color: "#FF0000", lineWidth: 2 });
          }
        }
        this.dispatchAim(this.results?.landmarks, this.results?.worldLandmarks);
      } else {
        this.dispatchAim([]);
      }
  
      this.canvasCtx.restore();
    }

    update() {
      if (this.webcamRunning) {
        this.predictWebcam();
      }
    }

    getPalmCenter(handLandmarks): { x: number; y: number; z: number } {
      const PALM_LANDMARKS = [0, 1, 5, 9, 13, 17]; // Wrist + MCP joints of all fingers
  
      let center = { x: 0, y: 0, z: 0 };
  
      // Calculate the centroid of the specified landmarks
      PALM_LANDMARKS.forEach((index) => {
          center.x += handLandmarks[index].x;
          center.y += handLandmarks[index].y;
          center.z += handLandmarks[index].z;
      });
  
      const numPoints = PALM_LANDMARKS.length;
      center.x /= numPoints;
      center.y /= numPoints;
      center.z /= numPoints;
  
      return center;
  }

    dispatchAim(landmarks, worldLandmarks) {
      if (landmarks?.length && landmarks?.length == worldLandmarks?.length) {
        let firings = [];
        let aimings = [];
        let gestureHands = [];
        
        for (var i = 0; i < landmarks.length; i++) {
          var l = landmarks[i];
          var wl = worldLandmarks[i];

          const wristAim = this.detectAimFromWrist(l);

          const isPointerExtended = this.isFingerExtendedWorld(wl, INDEX_FINGER) || this.isFingerExtended(l, INDEX_FINGER);

          if (isPointerExtended) {
            aimings.push(wristAim);
          } else {
            firings.push(wristAim);
          }

          const wasThumbUp = this.thumbUp[i];

          this.thumbUp[i] = this.isThumbExtended(wl, THUMB);

          this.switching = wasThumbUp && !this.thumbUp[i];

          
          gestureHands.push(this.getPalmCenter(l));
        }

        this.aiming = false;
        // this.aim = null;

        if (aimings.length) {
          let aim = {x: 0, y: 0};
          for (let a of aimings) {
            aim.x += a.x;
            aim.y += a.y;
          }
          aim.x /= aimings.length;
          aim.y /= aimings.length;
          this.aim = aim;
          this.aiming = true;
        } else if (firings.length) {
          let aim = {x: 0, y: 0};
          for (let f of firings) {
            aim.x += f.x;
            aim.y += f.y;
          }
          aim.x /= firings.length;
          aim.y /= firings.length;
          this.aim = aim;
          this.aiming = true;
        }

        this.firing = aimings.length >= 1;
        this.restart = firings.length >= 2;
        this.gestureHands = gestureHands;

        // console.log(this.aim, this.aiming, this.firing, this.restart)
      } else {
        this.firing = true;
        this.aiming = false;
        this.gestureHands = [];
      }
    }

    detectAimFromPointer(landmarks) {
      
      const index_finger_mcp = landmarks[5];
      const index_finger_tip = landmarks[8];

      const x = index_finger_mcp.x - index_finger_tip.x;
      const y = index_finger_mcp.y - index_finger_tip.y;

      let length = Math.sqrt(x * x + y * y);
      if (length == 0) {
        return {x: 0, y: 0}
      }
      
      return {x: x/length, y: y/length, length: length};
    }

    detectAimFromWrist(landmarks) {
      const wrist = landmarks[0];
      const index_finger_ip = landmarks[6];

      const x = wrist.x - index_finger_ip.x;
      const y = wrist.y - index_finger_ip.y;

      let length = Math.sqrt(x * x + y * y);
      if (length == 0) {
        return {x: 0, y: 0}
      }
      
      return {x: x/length, y: y/length, length: length};
    }

    isFingerExtended(landmarks, finger) {
      const wrist = landmarks[0];
      const index_finger_mcp = landmarks[finger[0]];
      const index_finger_ip = landmarks[finger[1]];
      const index_finger_tip = landmarks[finger[2]];

      const vec1 = {
        x: index_finger_ip.x - wrist.x,
        y: index_finger_ip.y - wrist.y,
        z: index_finger_ip.z - wrist.z,
      }
      const vec2 = {
        x: index_finger_tip.x - index_finger_ip.x,
        y: index_finger_tip.y - index_finger_ip.y,
        z: index_finger_tip.z - index_finger_ip.z,
      }

      const vec1mag = Math.sqrt(vec1.x ** 2 + vec1.y ** 2 + vec1.z ** 2);
      const vec2mag = Math.sqrt(vec2.x ** 2 + vec2.y ** 2 + vec2.z ** 2);

      const dotProduct =
          vec1.x * vec2.x +
          vec1.y * vec2.y +
          vec1.z * vec2.z;

      return dotProduct > 0;
    }

    isThumbExtended(landmarks, finger) {
      const wrist = landmarks[0];
      const index_finger_mcp = landmarks[finger[0]];
      const index_finger_ip = landmarks[finger[1]];
      const index_finger_tip = landmarks[finger[2]];

      const vec1 = {
        x: index_finger_ip.x - wrist.x,
        y: index_finger_ip.y - wrist.y,
        z: index_finger_ip.z - wrist.z,
      }
      const vec2 = {
        x: index_finger_tip.x - index_finger_ip.x,
        y: index_finger_tip.y - index_finger_ip.y,
        z: index_finger_tip.z - index_finger_ip.z
      }

      const vec1mag = Math.sqrt(vec1.x ** 2 + vec1.y ** 2 + vec1.z ** 2);
      const vec2mag = Math.sqrt(vec2.x ** 2 + vec2.y ** 2 + vec2.z ** 2);

      const dotProduct =
          vec1.x * vec2.x +
          vec1.y * vec2.y +
          vec1.z * vec2.z;

      return dotProduct / (vec1mag * vec2mag) > 0.95;
    }

    isFingerExtendedWorld(
      handLandmarks,
      finger: number[]
    ): boolean {
        const base = handLandmarks[finger[0]];
        const mid = handLandmarks[finger[1]];
        const tip = handLandmarks[finger[2]];
    
        // Calculate vectors
        const baseToMid = { x: mid.x - base.x, y: mid.y - base.y, z: mid.z - base.z };
        const midToTip = { x: tip.x - mid.x, y: tip.y - mid.y, z: tip.z - mid.z };
    
        // Check if the vectors are aligned (dot product and magnitude comparison)
        const dotProduct =
            baseToMid.x * midToTip.x +
            baseToMid.y * midToTip.y +
            baseToMid.z * midToTip.z;
    
        const baseToMidMag = Math.sqrt(baseToMid.x ** 2 + baseToMid.y ** 2 + baseToMid.z ** 2);
        const midToTipMag = Math.sqrt(midToTip.x ** 2 + midToTip.y ** 2 + midToTip.z ** 2);
    
        // Cosine similarity threshold for alignment
        const alignmentThreshold = finger == THUMB ? 0.5 : 0.95;
        const aligned = dotProduct / (baseToMidMag * midToTipMag) > alignmentThreshold;

        // Ensure the tip is farther away from the base along the finger's major direction
        const extended = Math.abs(tip.z - base.z) > Math.abs(mid.z - base.z);
    
        return aligned && extended;
    }

    flipLandmarks(landmarks: any[]): any[] {
      return landmarks.map((point) => ({
        ...point,
        x: 1 - point.x,
      }));
    }
  }
  
  export default VideoGestures;
  