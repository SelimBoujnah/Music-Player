// Enhanced Audio Playback Engine
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.audioElement = null;
        this.sourceNode = null;
        this.analyserNode = null;
        this.gainNode = null;
        this.initialized = false;
        
        // Audio state
        this.isPlaying = false;
        this.currentTrack = null;
        this.tracks = [];
        this.currentTrackIndex = 0;
        
        // Settings
        this.volume = 0.7; // 70%
        this.shuffleMode = false;
        this.repeatMode = false;
        
        // Event callbacks
        this.onTimeUpdate = null;
        this.onTrackChange = null;
        this.onPlayStateChange = null;
        this.onTrackEnd = null;
    }
    
    init(audioElement) {
        if (this.initialized) return;
        
        try {
            // Initialize Web Audio API context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioElement = audioElement;
            
            // Create audio graph
            this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
            this.analyserNode = this.audioContext.createAnalyser();
            this.gainNode = this.audioContext.createGain();
            
            // Connect nodes
            this.sourceNode.connect(this.analyserNode);
            this.analyserNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
            // Configure analyser
            this.analyserNode.fftSize = 256;
            
            // Set initial gain (volume)
            this.setVolume(this.volume);
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('Audio engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
            
            // Fallback to basic HTML5 audio
            this.audioElement = audioElement;
            this.setupEventListeners();
            this.initialized = true;
            console.log('Using fallback HTML5 audio player');
        }
    }
    
    setupEventListeners() {
        // Track time update
        this.audioElement.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                const currentTime = this.audioElement.currentTime;
                const duration = this.audioElement.duration;
                const progress = duration ? (currentTime / duration) * 100 : 0;
                
                this.onTimeUpdate({
                    currentTime,
                    duration,
                    progress
                });
            }
        });
        
        // Track ended
        this.audioElement.addEventListener('ended', () => {
            if (this.onTrackEnd) {
                this.onTrackEnd();
            }
            
            // Auto-play next based on settings
            if (this.repeatMode) {
                this.replay();
            } else if (this.shuffleMode) {
                this.playRandom();
            } else {
                this.next();
            }
        });
        
        // Track loading error
        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            // Skip to next track on error
            this.next();
        });
    }
    
    // Load tracks into the player
    loadTracks(trackList) {
        this.tracks = trackList;
        console.log(`Loaded ${this.tracks.length} tracks`);
    }
    
    // Load a specific track by index
    loadTrack(index) {
        if (this.tracks.length === 0) return false;
        
        // Bounds check
        if (index < 0) index = this.tracks.length - 1;
        if (index >= this.tracks.length) index = 0;
        
        this.currentTrackIndex = index;
        this.currentTrack = this.tracks[index];
        
        // Set source
        this.audioElement.src = this.currentTrack.url;
        this.audioElement.load();
        
        // Trigger callback
        if (this.onTrackChange) {
            this.onTrackChange(this.currentTrack, index);
        }
        
        return true;
    }
    
    // Play control methods
    play() {
        if (!this.audioElement.src && this.tracks.length > 0) {
            this.loadTrack(0);
        }
        
        // Resume audio context if suspended (autoplay policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                if (this.onPlayStateChange) {
                    this.onPlayStateChange(true);
                }
            })
            .catch(error => {
                console.error('Play error:', error);
            });
    }
    
    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
        
        if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
        }
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    // Track navigation
    next() {
        const success = this.loadTrack(this.currentTrackIndex + 1);
        if (success && this.isPlaying) {
            this.play();
        }
    }
    
    previous() {
        // If current time > 3s, restart current track
        if (this.audioElement.currentTime > 3) {
            this.audioElement.currentTime = 0;
            return;
        }
        
        const success = this.loadTrack(this.currentTrackIndex - 1);
        if (success && this.isPlaying) {
            this.play();
        }
    }
    
    playRandom() {
        if (this.tracks.length <= 1) return;
        
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * this.tracks.length);
        } while (randomIndex === this.currentTrackIndex);
        
        this.loadTrack(randomIndex);
        this.play();
    }
    
    replay() {
        this.audioElement.currentTime = 0;
        this.play();
    }
    
    // Playback control
    seek(time) {
        if (isNaN(this.audioElement.duration)) return;
        
        // Constrain time to valid range
        time = Math.max(0, Math.min(time, this.audioElement.duration));
        this.audioElement.currentTime = time;
    }
    
    seekByPercentage(percent) {
        if (isNaN(this.audioElement.duration)) return;
        
        const time = (percent / 100) * this.audioElement.duration;
        this.seek(time);
    }
    
    setVolume(level) {
        // Ensure level is between 0 and 1
        level = Math.max(0, Math.min(level, 1));
        this.volume = level;
        
        // Set volume on audio element
        this.audioElement.volume = level;
        
        // Set gain if Web Audio API is used
        if (this.gainNode) {
            this.gainNode.gain.value = level;
        }
        
        return level;
    }
    
    // Playback mode settings
    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        return this.shuffleMode;
    }
    
    toggleRepeat() {
        this.repeatMode = !this.repeatMode;
        return this.repeatMode;
    }
    
    // Audio visualization data (if needed)
    getAudioData() {
        if (!this.analyserNode) return null;
        
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        this.analyserNode.getByteFrequencyData(dataArray);
        return dataArray;
    }
    
    // Get current track metadata
    getCurrentTrackMetadata() {
        if (!this.currentTrack) return null;
        
        return {
            ...this.currentTrack,
            currentTime: this.audioElement.currentTime,
            duration: this.audioElement.duration,
            progress: (this.audioElement.currentTime / this.audioElement.duration) * 100
        };
    }
    
    // Format time for display (helper method)
    static formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
