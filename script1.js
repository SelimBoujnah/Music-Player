// Enhanced script1.js with fixed electron integration

window.addEventListener('DOMContentLoaded',async function() {
    console.log('DOM Content Loaded');
    
    // Check if we're running in Electron or browser
    const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
    console.log('Running in Electron:', isElectron);
    
    // DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;
    const uploadMusicBtn = document.getElementById('upload-music');
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('file-input');
    fileInput.setAttribute('webkitdirectory', '');
    fileInput.setAttribute('directory', '');
    fileInput.setAttribute('multiple', '');
    const libraryBtn = document.getElementById('library-section')
    const uploadStatus = document.getElementById('upload-status');
    const musicLibrary = document.getElementById('music-library');
    const likeBtn = document.querySelector('.like-btn');
    const likeIcon = likeBtn.querySelector('i');
    const featuredContent = document.querySelector('.featured-content')
    
    // Add a canvas for the visualizer
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'visualizer-container';
    visualizerContainer.classList.add('visualizer-container');
    
    let visualizerCanvas = null;
    visualizerCanvas = document.createElement('canvas');
    visualizerCanvas.id = 'audio-visualizer';
    visualizerCanvas.classList.add('audio-visualizer');

    visualizerContainer.appendChild(visualizerCanvas);
    
    // Insert the visualizer container into the player controls after the controls
    const playerControls = document.querySelector('.player-controls');
    const playerRight = document.querySelector('.player-right')
    playerControls.insertBefore(visualizerContainer, playerRight)

    // State variables for folder management
    let currentFolder = 'root';
    let tracks = [];
    let isLiked = false;



  
    
    
    // Call on app launch with checks to prevent errors
function safeLoadLastUsedFolder() {
    // Only try to load last folder if we're in Electron
    if (isElectron && typeof window.electron.getLastMusicFolder === 'function') {
        window.electron.getLastMusicFolder().then(lastFolder => {
            if (lastFolder) {
                // Last folder exists, load it
                loadLastUsedFolder();
            } else {
                // No last folder, prompt user to select one
                selectMusicFolder();
            }
        }).catch(error => {
            console.error('Error checking last folder:', error);
            // If there's an error, prompt user to select a folder
            selectMusicFolder();
        });
    } else {
        console.log('Not running in Electron or getLastMusicFolder not available - skipping folder loading');
    }
}
    
    // Run after a short delay to ensure DOM and Electron APIs are fully loaded
    setTimeout(safeLoadLastUsedFolder, 500);
    
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
    
    // Initialize audio visualizer
    let audioVisualizer = null;
    let audioContext = null;
    let audioSource = null;
    
     // Initialize the audio visualizer when we play a track
     function initializeVisualizer() {

        // Make sure AudioEngine exists before trying to use it
        if (typeof AudioEngine !== 'function') {
            console.error('AudioEngine not defined');
            return;
        }
        
        if (!audioContext && audioEngine && audioEngine.audioContext) {
            audioContext = audioEngine.audioContext;
        }
        
        if (!audioSource && audioEngine && audioEngine.audioSource) {
            audioSource = audioEngine.audioSource;
        }
        
        if (!audioVisualizer && audioSource && typeof AudioVisualizer === 'function') {
            try {
                audioVisualizer = new AudioVisualizer(visualizerCanvas, audioContext, audioSource);
                
                // Initialize with waveform settings
                audioVisualizer.barWidth = 2;
                audioVisualizer.barGap = 1;
                audioVisualizer.barColor = ' #cf1c12'; // red bars
                audioVisualizer.backgroundColor = 'transparent'; //transparent background
                
                audioVisualizer.init();
            } catch (error) {
                console.error('Error initializing audio visualizer:', error);
            }
        }
    }

    // Initialize audio engine with error checking
    let audioEngine = null;
    try {
        if (typeof AudioEngine === 'function') {
            audioEngine = new AudioEngine();
            audioEngine.init(audioElement);
            
            audioEngine.onPlayStateChange = function(isPlaying) {
                // Initialize visualizer if playing 
                if (isPlaying) {
                    // Resume audio context if suspended (browser requirement)
                    if (audioContext && audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                    
                    // Initialize visualizer if not already done
                    if (!audioVisualizer) {
                        initializeVisualizer();
                    }
                    
                    // Make sure visualizer is running when playing
                    if (audioVisualizer) {
                        audioVisualizer.start();
                        console.log("Visualizer started");
                    }
                } else if (audioVisualizer) {
                    audioVisualizer.stop();
                    console.log("Visualizer stopped");
                }
                
                // Update play button icon
                if (isPlaying) {
                    playIcon.classList.remove('fa-play');
                    playIcon.classList.add('fa-pause');
                } else {
                    playIcon.classList.remove('fa-pause');
                    playIcon.classList.add('fa-play');
                }
            };
            
            // Set up audio engine callbacks
            audioEngine.onTimeUpdate = function(data) {
                // Send progress to main process for taskbar/dock
                if (isElectron && typeof window.electron.updateProgress === 'function') {
                    window.electron.updateProgress(data.progress / 100);
                }
                // Update progress bar
                progressFill.style.width = `${data.progress}%`;
                
                // Update time display
                currentTimeDisplay.textContent = AudioEngine.formatTime(data.currentTime);
                if (!isNaN(data.duration)) {
                    totalTimeDisplay.textContent = AudioEngine.formatTime(data.duration);
                }
            };
            
            audioEngine.onTrackChange = function(track, index) {
                // Send notification on track change
                if (track.name && "Notification" in window) {
                    // Check if we need to request permission
                    if (Notification.permission === "granted") {
                        sendTrackNotification(track);
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then(permission => {
                            if (permission === "granted") {
                                sendTrackNotification(track);
                            }
                        });
                    }
                }

                // Update UI
                currentTrackName.textContent = track.name || 'Unknown Track';
                currentTrackArtist.textContent = track.artist || 'Unknown Artist';
                
                // Update cover art if available (new feature from metadata extractor)
                if (track.coverArt) {
                    currentTrackCover.innerHTML = `<img src="${track.coverArt}" alt="Album Cover">`;
                } else {
                    // Default placeholder
                    currentTrackCover.innerHTML = `<div class="cover-placeholder"><i class="fas fa-music"></i></div>`;
                }
                
                // Reset like button
                isLiked = false;
                likeIcon.classList.remove('fas');
                likeIcon.classList.add('far');
                
                // Update active track in list
                updateActiveTrack(index);
            };
        } else {
            console.error('AudioEngine class not available');
        }
    } catch (error) {
        console.error('Failed to initialize audio engine:', error);
    }
  
    // Helper function for notifications
    function sendTrackNotification(track) {
        if (!("Notification" in window)) return;
        
        const options = {
            body: `Artist: ${track.artist || 'Unknown Artist'}`,
            icon: track.coverArt || 'path/to/default-icon.png',
            silent: true // Don't play sound with notification
        };
        
        try {
            const notification = new Notification(`Now Playing: ${track.name || 'Unknown Track'}`, options);
            
            // Close notification after 5 seconds
            setTimeout(() => notification.close(), 5000);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
    
    // Theme management (LIGHT MODE AND DARK MODE)
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
        // update visibility of upload section
        uploadSection.style.display = 'block';
        featuredContent.style.display = 'none'
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');
    });

    //library music button
    libraryBtn.addEventListener('click', function(){
         // update visibility of library section
         featuredContent.style.display = 'block'
         uploadSection.style.display = 'none';
         
          // Update active state
          document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        libraryBtn.classList.add('active');
    });

 // Audio file processing
 function processAudioFiles(files) {
    if (!files || files.length === 0) {
        console.warn('No files to process');
        return;
    }
    
    // Clear existing library if this is first upload
    if (tracks.length === 0) {
        musicLibrary.innerHTML = '';
    }
    
    let processedCount = 0;
    const newTracks = [];
    
    files.forEach(async (file) => {
        try {
            // Check if AudioMetadataExtractor exists
            if (typeof AudioMetadataExtractor !== 'object') {
                console.error('AudioMetadataExtractor not available');
                throw new Error('Metadata extractor not available');
            }
            
            // Use AudioMetadataExtractor to get comprehensive metadata
            const metadata = await AudioMetadataExtractor.extractMetadata(file);
            
            // Create track object with extracted metadata
            const trackData = {
                id: tracks.length + newTracks.length,
                name: metadata.name || file.name || 'Unknown Track',
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                genre: metadata.genre || '',
                year: metadata.year || '',
                duration: metadata.duration || 0,
                coverArt: metadata.coverArt || null,
                fileType: metadata.fileType || file.type,
                url: await AudioMetadataExtractor.fileToDataURL(file),
                folder: currentFolder // Add folder property
            };
            
            // Add to new tracks array
            newTracks.push(trackData);
            
            // Check if all files have been processed
            processedCount++;
            if (processedCount === files.length) {
                finishLoadingTracks(newTracks);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            
            // Create a basic track entry even if metadata extraction fails
            try {
                const basicTrackData = {
                    id: tracks.length + newTracks.length,
                    name: file.name || 'Unknown Track',
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    duration: 0,
                    url: URL.createObjectURL(file),
                    folder: currentFolder
                };
                
                newTracks.push(basicTrackData);
            } catch (fallbackError) {
                console.error('Failed to create basic track data:', fallbackError);
            }
            
            processedCount++;
            
            // Check if all files have been processed
            if (processedCount === files.length) {
                finishLoadingTracks(newTracks);
            }
        }
    });
}

    
// File upload method
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        uploadStatus.textContent = `Loading ${files.length} file(s) from folder...`;
        
        // Filter for audio files
        const audioFiles = files.filter(file => {
            const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4'];
            // For files without proper MIME types, check extension
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const validExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'];
            
            return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
        });
        
        if (audioFiles.length === 0) {
            uploadStatus.textContent = 'No valid audio files found in the selected folder.';
            return;
        }
        
        // Update status with folder name (get from first file's path)
        if (audioFiles.length > 0 && audioFiles[0].webkitRelativePath) {
            const folderPath = audioFiles[0].webkitRelativePath.split('/')[0];
            uploadStatus.textContent = `Loading ${audioFiles.length} audio files from "${folderPath}"...`;
        }
         
        // Process audio files
        processAudioFiles(audioFiles);
    });

    
    

   
    // Helper function to finish loading tracks
    function finishLoadingTracks(newTracks) {
        if (!newTracks || newTracks.length === 0) {
            uploadStatus.textContent = 'No tracks could be loaded';
            return;
        }
        
        // Add new tracks to the global tracks array
        tracks = [...tracks, ...newTracks];
        
        // Add to UI 
        newTracks.forEach(track => {
            addTrackToUI(track);
        });
        
        // Update audio engine if it exists
        if (audioEngine) {
            audioEngine.loadTracks(tracks);
            
            // Load first track if this is the first batch
            if (tracks.length === newTracks.length) {
                audioEngine.loadTrack(0);
            }
        }
        
        uploadStatus.textContent = `Successfully added ${newTracks.length} track(s)`;
        setTimeout(() => {
            uploadStatus.textContent = '';
        }, 3000);
    }
    
    // Add track to UI with support for cover art
    function addTrackToUI(trackData) {
        if (!trackData) return;
        
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.id = trackData.id;
        
        // Format duration - use utility if available, otherwise fallback
        let formattedDuration = '0:00';
        if (trackData.duration) {
            if (typeof AudioMetadataExtractor === 'object' && 
                typeof AudioMetadataExtractor.formatDuration === 'function') {
                formattedDuration = AudioMetadataExtractor.formatDuration(trackData.duration);
            } else {
                // Basic fallback formatter
                const minutes = Math.floor(trackData.duration / 60);
                const seconds = Math.floor(trackData.duration % 60).toString().padStart(2, '0');
                formattedDuration = `${minutes}:${seconds}`;
            }
        }
        
        // Prepare cover art HTML if available
        let coverHTML = '';
        if (trackData.coverArt) {
            coverHTML = `<img src="${trackData.coverArt}" class="track-cover-img" alt="Cover">`;
        }
        
        trackItem.innerHTML = `
            <div class="track-number">${trackData.id + 1}</div>
            <div class="track-cover">${coverHTML}</div>
            <div class="track-info">
                <span class="track-name">${trackData.name || 'Unknown Track'}</span>
                <span class="artist-name">${trackData.artist || 'Unknown Artist'}</span>
                ${trackData.folder && trackData.folder !== 'root' ? 
                  `<span class="track-folder">Folder: ${trackData.folder}</span>` : ''}
            </div>
            <div class="track-album">${trackData.album || 'Unknown Album'}</div>
            <div class="track-duration">${formattedDuration}</div>
        `;
        
        // Add click event to play this track
        trackItem.addEventListener('click', function() {
            if (!audioEngine) return;
            
            const trackId = parseInt(this.dataset.id);
            if (isNaN(trackId)) return;
            
            audioEngine.loadTrack(trackId);
            audioEngine.play();
        });
        
        // Add hover play icon
        trackItem.addEventListener('mouseover', function() {
            const trackNumber = this.querySelector('.track-number');
            if (trackNumber) trackNumber.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        trackItem.addEventListener('mouseout', function() {
            const trackNumber = this.querySelector('.track-number');
            if (!trackNumber) return;
            
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
            if (!trackNumber) return;
            
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
        if (!audioEngine || tracks.length === 0) return;
        audioEngine.togglePlay();
    });
    
    prevButton.addEventListener('click', function() {
        if (!audioEngine) return;
        audioEngine.previous();
    });
    
    nextButton.addEventListener('click', function() {
        if (!audioEngine) return;
        audioEngine.next();
    });
    
    shuffleButton.addEventListener('click', function() {
        if (!audioEngine) return;
        const shuffleEnabled = audioEngine.toggleShuffle();
        this.classList.toggle('active', shuffleEnabled);
    });
    
    repeatButton.addEventListener('click', function() {
        if (!audioEngine) return;
        const repeatEnabled = audioEngine.toggleRepeat();
        this.classList.toggle('active', repeatEnabled);
    });
    
    // Progress bar interaction
    progressBar.addEventListener('click', function(e) {
        if (!audioEngine) return;
        const clickPosition = e.offsetX / progressBar.offsetWidth;
        audioEngine.seekByPercentage(clickPosition * 100);
    });
    
    // Volume bar interaction
    volumeBar.addEventListener('click', function(e) {
        if (!audioEngine) return;
        const volume = e.offsetX / volumeBar.offsetWidth;
        audioEngine.setVolume(volume);
        volumeFill.style.width = `${volume * 100}%`;
        updateVolumeIcon(volume);
    });
    
    // Volume button mute/unmute toggle
    let previousVolume = 0.7; // 70%
    volumeButton.addEventListener('click', function() {
        if (!audioEngine) return;
        
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
        if (!audioEngine) return;
        
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

    // File input for manual uploads
    const fileInputEl = document.getElementById('fileInput');
    if (fileInputEl) {
        fileInputEl.addEventListener('change', function (event) {
            const files = event.target.files;
            const libraryList = document.getElementById('libraryList');
            if (!libraryList) return;
            
            libraryList.innerHTML = ''; // Clear previous list
        
            Array.from(files).forEach((file, index) => {
                try {
                    const audioURL = URL.createObjectURL(file);
                    const listItem = document.createElement('li');
                    const audio = new Audio(audioURL);
                
                    audio.addEventListener('loadedmetadata', () => {
                        const duration = formatTime(audio.duration);
                        listItem.textContent = `${file.name} (${duration})`;
                    });
                
                    listItem.addEventListener('click', () => {
                        playAudioFile(audioURL);
                    });
                
                    libraryList.appendChild(listItem);
                } catch (error) {
                    console.error('Error processing file for library list:', error);
                }
            });
        });
    }
    
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    function playAudioFile(audioURL) {
        const audio = new Audio(audioURL);
        audio.play();
 
    }
    
});