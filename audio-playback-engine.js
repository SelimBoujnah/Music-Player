class AudioEngine {
    constructor() {
        this.audioElement = null;
        this.tracks = [];
        this.currentTrackIndex = 0;
        this.shuffle = false;
        this.repeat = false;
        this.volume = 0.7;

        // Callbacks
        this.onTimeUpdate = null;
        this.onTrackChange = null;
        this.onPlayStateChange = null;

        // AudioContext + Visualizer setup
        this.audioContext = null;
        this.audioSource = null;
        this.audioVisualizer = null;
        this.visualizerCanvas = null;
    }

    init(audioElement, visualizerCanvas = null) {
        this.audioElement = audioElement;
        this.audioElement.volume = this.volume;

        if (visualizerCanvas) {
            this.visualizerCanvas = visualizerCanvas;
        }

        // Set up time update listener
        this.audioElement.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                const duration = this.audioElement.duration;
                const currentTime = this.audioElement.currentTime;
                const progress = (currentTime / duration) * 100;
                this.onTimeUpdate({ currentTime, duration, progress });
            }
        });

        // Set up end-of-track handling
        this.audioElement.addEventListener('ended', () => {
            if (this.repeat) {
                this.play();
            } else {
                this.next();
            }
        });
    }

    setupAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    
        if (!this.audioSource) {
            try {
                // Check if the audio element is already connected elsewhere
                if (!window.audioElementConnected) {
                    this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
                    this.audioSource.connect(this.audioContext.destination);
                    window.audioElementConnected = true;
                } else {
                    console.log("AudioElement already connected elsewhere, skipping source creation");
                }
            } catch (e) {
                console.warn("AudioSource creation failed:", e.message);
            }
        }
    }

    setupVisualizer(AudioVisualizerClass) {
        if (!this.visualizerCanvas || !this.audioContext || !this.audioSource) return;

        if (!this.audioVisualizer) {
            this.audioVisualizer = new AudioVisualizerClass(
                this.visualizerCanvas,
                this.audioContext,
                this.audioSource
            );

            if (this.audioVisualizer.init()) {
                this.audioVisualizer.resizeCanvas();
            }
        }
    }

    loadTracks(tracks) {
        this.tracks = tracks;
    }

    loadTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        this.currentTrackIndex = index;

        const track = this.tracks[index];
        this.audioElement.src = track.url;
        this.audioElement.load();

        if (this.onTrackChange) {
            this.onTrackChange(track, index);
        }
    }

    play() {
        this.setupAudioContext();
        
        // Resume AudioContext (required by browsers)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
            });
        }
        
        this.audioElement.play().then(() => {
            if (this.onPlayStateChange) {
                this.onPlayStateChange(true);
            }
        }).catch((err) => {
            console.error("Play error:", err);
        });
    }

    pause() {
        this.audioElement.pause();
        if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
        }
    }

    togglePlay() {
        if (this.audioElement.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    next() {
        let nextIndex = this.shuffle
            ? Math.floor(Math.random() * this.tracks.length)
            : this.currentTrackIndex + 1;

        if (nextIndex >= this.tracks.length) nextIndex = 0;
        this.loadTrack(nextIndex);
        this.play();
    }

    previous() {
        let prevIndex = this.currentTrackIndex - 1;
        if (prevIndex < 0) prevIndex = this.tracks.length - 1;
        this.loadTrack(prevIndex);
        this.play();
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        return this.shuffle;
    }

    toggleRepeat() {
        this.repeat = !this.repeat;
        return this.repeat;
    }

    seekByPercentage(percent) {
        if (!isNaN(this.audioElement.duration)) {
            this.audioElement.currentTime = (percent / 100) * this.audioElement.duration;
        }
    }

    setVolume(volume) {
        this.volume = volume;
        this.audioElement.volume = volume;
    }

    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
}
