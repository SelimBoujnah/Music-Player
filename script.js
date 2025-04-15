// Music Player Integration
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements (using your existing selectors)
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;
    const uploadMusicBtn = document.getElementById('upload-music');
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const musicLibrary = document.getElementById('music-library');
    const likeBtn = document.querySelector('.like-btn');
    const likeIcon = likeBtn.querySelector('i');
    
    // Player Controls
    const audioElement = document.getElementById('audio-player');
    const playButton = document.getElementById('play-btn');
    const playIcon = playButton.querySelector('i');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');
    const shuffleButton = document.getElementById('shuffle-btn');
    const repeatButton = document.getElementById('repeat-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    const volumeButton = document.getElementById('volume-btn');
    const volumeIcon = volumeButton.querySelector('i');
    const volumeBar = document.getElementById('volume-bar');
    const volumeFill = document.getElementById('volume-fill');
    const currentTrackName = document.getElementById('current-track-name');
    const currentTrackArtist = document.getElementById('current-track-artist');
    const currentTrackCover = document.getElementById('current-track-cover');
    
    // State
    let isLiked = false;
    let tracks = [];
    
    // Initialize audio engine
    const audioEngine = new AudioEngine();
    audioEngine.init(audioElement);
    
    // Set up audio engine callbacks
    audioEngine.onTimeUpdate = function(data) {
        // Update progress bar
        progressFill.style.width = `${data.progress}%`;
        
        // Update time display
        currentTimeDisplay.textContent = AudioEngine.formatTime(data.currentTime);
        if (!isNaN(data.duration)) {
            totalTimeDisplay.textContent = AudioEngine.formatTime(data.duration);
        }
    };
    
    audioEngine.onTrackChange = function(track, index) {
        // Update UI
        currentTrackName.textContent = track.name;
        currentTrackArtist.textContent = track.artist;
        
        // Reset like button
        isLiked = false;
        likeIcon.classList.remove('fas');
        likeIcon.classList.add('far');
        
        // Update active track in list
        updateActiveTrack(index);
    };
    
    audioEngine.onPlayStateChange = function(isPlaying) {
        // Update play button icon
        if (isPlaying) {
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
        } else {
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
        }
    };
    
    // Theme management (your existing code)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleBtn.textContent = '🌙';
    } else {
        themeToggleBtn.textContent = '☀️';
    }
    
    themeToggleBtn.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        
        // Update icon
        if (body.classList.contains('dark-mode')) {
            themeToggleBtn.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggleBtn.textContent = '☀️';
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Like button functionality
    likeBtn.addEventListener('click', function() {
        isLiked = !isLiked;
        
        if (isLiked) {
            likeIcon.classList.remove('far');
            likeIcon.classList.add('fas');
        } else {
            likeIcon.classList.remove('fas');
            likeIcon.classList.add('far');
        }
    });
    
    // Upload music button
    uploadMusicBtn.addEventListener('click', function() {
        // Toggle visibility of upload section
        uploadSection.style.display = uploadSection.style.display === 'none' ? 'block' : 'none';
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');
    });
    
    // File input change handler
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        uploadStatus.textContent = `Loading ${files.length} file(s)...`;
        
        // Filter for audio files
        const audioFiles = files.filter(file => {
            const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4'];
            return validTypes.includes(file.type);
        });
        
        if (audioFiles.length === 0) {
            uploadStatus.textContent = 'No valid audio files selected.';
            return;
        }
        
        // Process audio files
        processAudioFiles(audioFiles);
    });
    
    // Enhanced audio file processing
    function processAudioFiles(files) {
        // Clear existing library if this is first upload
        if (tracks.length === 0) {
            musicLibrary.innerHTML = '';
        }
        
        let loadedCount = 0;
        let metadataExtracted = 0;
        const newTracks = [];
        
        files.forEach((file) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Create a temporary audio element to get metadata
                const tempAudio = new Audio(e.target.result);
                
                tempAudio.onloadedmetadata = function() {
                    // Create track object with basic info
                    const trackData = {
                        id: tracks.length + newTracks.length,
                        name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        duration: tempAudio.duration,
                        url: e.target.result,
                        fileType: file.type
                    };
                    
                    // Try to extract artist and title from filename
                    extractMetadataFromFilename(trackData);
                    
                    // Add to new tracks array
                    newTracks.push(trackData);
                    metadataExtracted++;
                    
                    // Check if all metadata has been extracted
                    if (metadataExtracted === files.length) {
                        finishLoadingTracks(newTracks);
                    }
                };
                
                tempAudio.onerror = function() {
                    loadedCount++;
                    metadataExtracted++;
                    uploadStatus.textContent = `Error loading file: ${file.name}`;
                    
                    // Check if all files have been processed
                    if (metadataExtracted === files.length) {
                        finishLoadingTracks(newTracks);
                    }
                };
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    // Helper function to extract metadata from filename
    function extractMetadataFromFilename(trackData) {
        // Try to match "Artist - Title" pattern
        const nameParts = trackData.name.split(' - ');
        if (nameParts.length > 1) {
            trackData.artist = nameParts[0];
            trackData.name = nameParts.slice(1).join(' - ');
        }
        
        // Try to extract album from folder structure (if available)
        // This would need file path info which isn't available in browser
        
        return trackData;
    }
    
    // Helper function to finish loading tracks
    function finishLoadingTracks(newTracks) {
        // Add new tracks to the global tracks array
        tracks = [...tracks, ...newTracks];
        
        // Add to UI
        newTracks.forEach(track => {
            addTrackToUI(track);
        });
        
        // Update audio engine
        audioEngine.loadTracks(tracks);
        
        // Load first track if this is the first batch
        if (tracks.length === newTracks.length) {
            audioEngine.loadTrack(0);
        }
        
        uploadStatus.textContent = `Successfully added ${newTracks.length} track(s)`;
        setTimeout(() => {
            uploadStatus.textContent = '';
        }, 3000);
    }
    
    // Add track to UI (mostly from your existing code)
    function addTrackToUI(trackData) {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.id = trackData.id;
        
        // Format duration
        const formattedDuration = AudioEngine.formatTime(trackData.duration);
        
        trackItem.innerHTML = `
            <div class="track-number">${trackData.id + 1}</div>
            <div class="track-cover"></div>
            <div class="track-info">
                <span class="track-name">${trackData.name}</span>
                <span class="artist-name">${trackData.artist}</span>
            </div>
            <div class="track-album">${trackData.album}</div>
            <div class="track-duration">${formattedDuration}</div>
        `;
        
        // Add click event to play this track
        trackItem.addEventListener('click', function() {
            const trackId = parseInt(this.dataset.id);
            audioEngine.loadTrack(trackId);
            audioEngine.play();
        });
        
        // Add hover play icon
        trackItem.addEventListener('mouseover', function() {
            const trackNumber = this.querySelector('.track-number');
            trackNumber.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        trackItem.addEventListener('mouseout', function() {
            const trackNumber = this.querySelector('.track-number');
            if (!this.classList.contains('active')) {
                trackNumber.textContent = parseInt(this.dataset.id) + 1;
            }
        });
        
        musicLibrary.appendChild(trackItem);
    }
    
    // Update active track in library
    function updateActiveTrack(index) {
        document.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('active');
            const trackNumber = item.querySelector('.track-number');
            const itemId = parseInt(item.dataset.id);
            
            if (itemId === index) {
                item.classList.add('active');
                trackNumber.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else {
                trackNumber.textContent = itemId + 1;
            }
        });
    }
    
    // Player controls event listeners
    playButton.addEventListener('click', function() {
        if (tracks.length === 0) return;
        audioEngine.togglePlay();
    });
    
    prevButton.addEventListener('click', function() {
        audioEngine.previous();
    });
    
    nextButton.addEventListener('click', function() {
        audioEngine.next();
    });
    
    shuffleButton.addEventListener('click', function() {
        const shuffleEnabled = audioEngine.toggleShuffle();
        this.classList.toggle('active', shuffleEnabled);
    });
    
    repeatButton.addEventListener('click', function() {
        const repeatEnabled = audioEngine.toggleRepeat();
        this.classList.toggle('active', repeatEnabled);
    });
    
    // Progress bar interaction
    progressBar.addEventListener('click', function(e) {
        const clickPosition = e.offsetX / progressBar.offsetWidth;
        audioEngine.seekByPercentage(clickPosition * 100);
    });
    
    // Volume bar interaction
    volumeBar.addEventListener('click', function(e) {
        const volume = e.offsetX / volumeBar.offsetWidth;
        audioEngine.setVolume(volume);
        volumeFill.style.width = `${volume * 100}%`;
        updateVolumeIcon(volume);
    });
    
    // Volume button mute/unmute toggle
    let previousVolume = 0.7; // 70%
    volumeButton.addEventListener('click', function() {
        if (audioEngine.volume > 0) {
            previousVolume = audioEngine.volume;
            audioEngine.setVolume(0);
            volumeFill.style.width = '0%';
            volumeIcon.className = 'fas fa-volume-mute';
        } else {
            audioEngine.setVolume(previousVolume);
            volumeFill.style.width = `${previousVolume * 100}%`;
            updateVolumeIcon(previousVolume);
        }
    });
    
    // Helper function to update volume icon
    function updateVolumeIcon(volume) {
        if (volume === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // Optional: Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Only if we're not in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case ' ': // Space bar
                e.preventDefault();
                if (tracks.length > 0) audioEngine.togglePlay();
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    audioEngine.next();
                }
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    audioEngine.previous();
                }
                break;
            case 'm':
                e.preventDefault();
                if (audioEngine.volume > 0) {
                    previousVolume = audioEngine.volume;
                    audioEngine.setVolume(0);
                    volumeFill.style.width = '0%';
                    volumeIcon.className = 'fas fa-volume-mute';
                } else {
                    audioEngine.setVolume(previousVolume);
                    volumeFill.style.width = `${previousVolume * 100}%`;
                    updateVolumeIcon(previousVolume);
                }
                break;
        }
    });
});