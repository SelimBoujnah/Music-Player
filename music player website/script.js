// Music Player with File Loading Functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
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
    const audioPlayer = document.getElementById('audio-player');
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
    
    // Player State
    let isPlaying = false;
    let currentTrackIndex = 0;
    let tracks = [];
    let shuffleMode = false;
    let repeatMode = false;
    let previousVolume = 70; // Default volume level (70%)
    let isLiked = false; // Track like state
    
    // Theme management
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleBtn.textContent = '🌙';
    } else {
        themeToggleBtn.textContent = '☀️';
    }
    
    // Theme toggle event listener
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
    
    // Process audio files
    function processAudioFiles(files) {
        // Clear existing library if this is first upload
        if (tracks.length === 0) {
            musicLibrary.innerHTML = '';
        }
        
        let loadedCount = 0;
        
        files.forEach((file) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Create a temporary audio element to get metadata
                const tempAudio = new Audio(e.target.result);
                
                tempAudio.onloadedmetadata = function() {
                    const trackData = {
                        id: tracks.length,
                        name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        duration: tempAudio.duration,
                        url: e.target.result
                    };
                    
                    // Try to extract artist and title from filename
                    const nameParts = trackData.name.split(' - ');
                    if (nameParts.length > 1) {
                        trackData.artist = nameParts[0];
                        trackData.name = nameParts.slice(1).join(' - ');
                    }
                    
                    // Add to tracks array
                    tracks.push(trackData);
                    
                    // Add to UI
                    addTrackToUI(trackData);
                    
                    loadedCount++;
                    uploadStatus.textContent = `Loaded ${loadedCount} of ${files.length} file(s)`;
                    
                    // If all files loaded, load the first track
                    if (loadedCount === files.length) {
                        if (tracks.length === files.length) {
                            // This was the first batch of files
                            loadTrack(0);
                        }
                        uploadStatus.textContent = `Successfully added ${files.length} track(s)`;
                        setTimeout(() => {
                            uploadStatus.textContent = '';
                        }, 3000);
                    }
                };
                
                tempAudio.onerror = function() {
                    loadedCount++;
                    uploadStatus.textContent = `Error loading file: ${file.name}`;
                };
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    // Add track to UI
    function addTrackToUI(trackData) {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.id = trackData.id;
        
        // Format duration
        const minutes = Math.floor(trackData.duration / 60);
        const seconds = Math.floor(trackData.duration % 60);
        const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
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
            loadTrack(trackId);
            playTrack();
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
    
    // Load track
    function loadTrack(index) {
        if (tracks.length === 0) return;
        
        // Bounds check
        if (index < 0) index = tracks.length - 1;
        if (index >= tracks.length) index = 0;
        
        currentTrackIndex = index;
        const track = tracks[index];
        
        // Update audio source
        audioPlayer.src = track.url;
        audioPlayer.load();
        
        // Update UI
        currentTrackName.textContent = track.name;
        currentTrackArtist.textContent = track.artist;
        
        // Reset like button
        isLiked = false;
        likeIcon.classList.remove('fas');
        likeIcon.classList.add('far');
        
        // Update active track in list
        document.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === index) {
                item.classList.add('active');
                const trackNumber = item.querySelector('.track-number');
                trackNumber.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });
        
        // Reset progress bar
        progressFill.style.width = '0%';
        currentTimeDisplay.textContent = '0:00';
        
        // Set volume
        audioPlayer.volume = parseFloat(volumeFill.style.width) / 100 || 0.7;
    }
    
    // Play track
    function playTrack() {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                playIcon.classList.remove('fa-play');
                playIcon.classList.add('fa-pause');
            })
            .catch(error => {
                console.error('Error playing track:', error);
            });
    }
    
    // Pause track
    function pauseTrack() {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    }
    
    // Play/Pause button event
    playButton.addEventListener('click', function() {
        if (tracks.length === 0) return;

        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    });

    // Previous button event
    prevButton.addEventListener('click', function() {
        loadTrack(currentTrackIndex - 1);
        playTrack();
    });

    // Next button event
    nextButton.addEventListener('click', function() {
        loadTrack(currentTrackIndex + 1);
        playTrack();
    });

    // Shuffle button toggle
    shuffleButton.addEventListener('click', function() {
        shuffleMode = !shuffleMode;
        this.classList.toggle('active');
    });

    // Repeat button toggle
    repeatButton.addEventListener('click', function() {
        repeatMode = !repeatMode;
        this.classList.toggle('active');
    });

    // Track end event
    audioPlayer.addEventListener('ended', function() {
        if (repeatMode) {
            playTrack();
        } else if (shuffleMode) {
            const nextIndex = Math.floor(Math.random() * tracks.length);
            loadTrack(nextIndex);
            playTrack();
        } else {
            loadTrack(currentTrackIndex + 1);
            playTrack();
        }
    });

    // Progress bar update
    audioPlayer.addEventListener('timeupdate', function() {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${progressPercent}%`;

        // Update current time
        const minutes = Math.floor(audioPlayer.currentTime / 60);
        const seconds = Math.floor(audioPlayer.currentTime % 60);
        currentTimeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Update total time
        if (!isNaN(audioPlayer.duration)) {
            const totalMinutes = Math.floor(audioPlayer.duration / 60);
            const totalSeconds = Math.floor(audioPlayer.duration % 60);
            totalTimeDisplay.textContent = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        }
    });

    // Seek bar interaction
    progressBar.addEventListener('click', function(e) {
        const clickPosition = e.offsetX / progressBar.offsetWidth;
        audioPlayer.currentTime = clickPosition * audioPlayer.duration;
    });

    // Volume bar interaction
    volumeBar.addEventListener('click', function(e) {
        const volume = e.offsetX / volumeBar.offsetWidth;
        audioPlayer.volume = volume;
        volumeFill.style.width = `${volume * 100}%`;

        updateVolumeIcon(volume);
        previousVolume = volume * 100;
    });

    // Volume button mute/unmute toggle
    volumeButton.addEventListener('click', function() {
        if (audioPlayer.volume > 0) {
            previousVolume = audioPlayer.volume * 100;
            audioPlayer.volume = 0;
            volumeFill.style.width = '0%';
            volumeIcon.className = 'fas fa-volume-mute';
        } else {
            audioPlayer.volume = previousVolume / 100;
            volumeFill.style.width = `${previousVolume}%`;
            updateVolumeIcon(previousVolume / 100);
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
});