
class AudioVisualizer {
    constructor(canvas, audioContext, audioSource) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioContext = audioContext;
        this.audioSource = audioSource;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.isActive = false;
        this.frameId = null;
        
        // Waveform visualization settings
        this.barWidth = 2;
        this.barGap = 1;
        this.barColor = ' #cf1c12'; // red bars
        this.backgroundColor = 'transparent'; // transparent background
        this.smoothing = 0.8;
    }

    init() {
        console.log("AudioVisualizer init called");
        if (!this.audioContext || !this.audioSource) {
            console.error('AudioVisualizer: Audio context or source not provided');
            return false;
        }

        try {
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.audioSource.connect(this.analyser);
            
            // Configure analyser for waveform data
            this.analyser.fftSize = 2048; // Larger FFT for smoother waveform
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.analyser.smoothingTimeConstant = this.smoothing;
            
            console.log(`AudioVisualizer: Analyzer created with bufferLength ${this.bufferLength}`);

            // Set background color of canvas container
            if (this.canvas.parentElement) {
                this.canvas.parentElement.style.backgroundColor = this.backgroundColor;
            }
            
            // Ensure canvas is properly sized
            this.resizeCanvas();
            
            return true;
        } catch (err) {
            console.error("Failed to initialize audio visualizer:", err);
            return false;
        }
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            console.log(`Canvas resized to ${displayWidth}x${displayHeight}`);
        }
    }
    
    start() {
        console.log("AudioVisualizer start called");
        if (!this.analyser) {
            if (!this.init()) return;
        }
        
        this.isActive = true;
        this.draw();
    }
    
    stop() {
        console.log("AudioVisualizer stop called");
        this.isActive = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }
    
    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
        return this.isActive;
    }
    
    draw() {
        if (!this.isActive) return;
        
        this.frameId = requestAnimationFrame(() => this.draw());
        
        // Get time domain data (waveform) instead of frequency data
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw waveform
        this.drawWaveform();
    }
    
    drawWaveform() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;
        
        // Calculate how many points we can draw
        const totalBars = Math.floor(width / (this.barWidth + this.barGap));
        const step = Math.ceil(this.bufferLength / totalBars);
        
        this.ctx.fillStyle = this.barColor;
        
        let x = 0;
        
        for (let i = 0; i < totalBars; i++) {
            // Get data point (average if necessary)
            const dataIndex = Math.min(i * step, this.bufferLength - 1);
            
            // Convert 0-255 value to -1.0 to 1.0 range
            const normalized = (this.dataArray[dataIndex] / 128.0) - 1.0;
            
            // Calculate bar height based on waveform data
            const barHeight = Math.max(2, Math.abs(normalized * centerY) * 0.8);
            
            // Draw the bar centered vertically
            if (normalized >= 0) {
                // For positive values, draw up from center
                this.ctx.fillRect(x, centerY - barHeight, this.barWidth, barHeight);
            } else {
                // For negative values, draw down from center
                this.ctx.fillRect(x, centerY, this.barWidth, barHeight);
            }
            
            // Move to next bar position
            x += this.barWidth + this.barGap;
        }
    }
}