// Music Player Integration with Enhanced Metadata Extraction
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
    let folders = ['root']; // 'root' is the default folder
    let currentFolder = 'root';
    let tracks = [];
    let isLiked = false;

    // Add folder management elements
    const createFolderBtn = document.createElement('button');
    createFolderBtn.id = 'create-folder-btn';
    createFolderBtn.className = 'folder-btn';
    createFolderBtn.innerHTML = '<i class="fas fa-folder-plus"></i> Create Folder';
    
    const selectFolderBtn = document.createElement('button');
    selectFolderBtn.id = 'select-folder-btn';
    selectFolderBtn.className = 'folder-btn';
    selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Select Folder';
    
    const folderSelect = document.createElement('select');
    folderSelect.id = 'folder-select';
    folderSelect.className = 'folder-select';
    
    const folderManagementDiv = document.createElement('div');
    folderManagementDiv.className = 'folder-management';
    folderManagementDiv.appendChild(createFolderBtn);
    folderManagementDiv.appendChild(selectFolderBtn);
    folderManagementDiv.appendChild(folderSelect);
    
    // Insert folder management into upload section
    const uploadContainer = document.querySelector('.upload-container');
    uploadContainer.insertBefore(folderManagementDiv, uploadContainer.firstChild);

    // Initialize folder dropdown
    updateFolderDropdown();

    // Folder management event listeners
    createFolderBtn.addEventListener('click', createNewFolder);
    selectFolderBtn.addEventListener('click', selectMusicFolder);
    folderSelect.addEventListener('change', changeCurrentFolder);

    // Load saved folders when app starts
    if (window.electron) {
        window.electron.getSavedFolders().then(savedFolders => {
            if (savedFolders && savedFolders.length > 0) {
                folders = savedFolders;
                updateFolderDropdown();
            }
        });
    }

    // Folder management functions
    async function createNewFolder() {
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;
        
        if (folders.includes(folderName)) {
            alert('Folder already exists!');
            return;
        }
        
        folders.push(folderName);
        updateFolderDropdown();
        
        // Save folders to storage if using Electron
        if (window.electron) {
            try {
                await window.electron.saveFolders(folders);
            } catch (error) {
                console.error('Error saving folders:', error);
            }
        }
    }

    async function selectMusicFolder() {
        if (!window.electron) {
            alert('Folder selection only available in Electron app');
            return;
        }
        
        try {
            const folderPath = await window.electron.selectMusicFolder();
            if (folderPath) {
                uploadStatus.textContent = `Selected folder: ${path.basename(folderPath)}`;
                
                // Scan the folder for music files
                const files = await window.electron.scanMusicFolder(folderPath);
                if (files.length > 0) {
                    processAudioFiles(files);
                } else {
                    uploadStatus.textContent = 'No music files found in selected folder.';
                }
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
            uploadStatus.textContent = 'Error selecting folder';
        }
    }

    function changeCurrentFolder() {
        currentFolder = folderSelect.value;
        filterTracksByFolder();
    }

    function updateFolderDropdown() {
        folderSelect.innerHTML = '';
        
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder === 'root' ? 'Main Library' : folder;
            folderSelect.appendChild(option);
        });
        
        folderSelect.value = currentFolder;
    }

    function filterTracksByFolder() {
        musicLibrary.innerHTML = '';
        
        const filteredTracks = tracks.filter(track => track.folder === currentFolder);
        
        if (filteredTracks.length === 0) {
            const noTracksMsg = document.createElement('div');
            noTracksMsg.className = 'no-tracks-message';
            noTracksMsg.textContent = 'No tracks in this folder';
            musicLibrary.appendChild(noTracksMsg);
        } else {
            filteredTracks.forEach(track => addTrackToUI(track));
        }
    }

    // Add a function to load the last folder used
    async function loadLastUsedFolder() {
        if (!window.electron || typeof window.electron.getLastMusicFolder !== 'function') {
            console.warn('Electron API not available — skipping loadLastUsedFolder');
            return;
        }
    
        try {
            const lastFolder = await window.electron.getLastMusicFolder();
            if (lastFolder) {
                uploadStatus.textContent = `Loading music from last used folder: ${path.basename(lastFolder)}`;
                const files = await window.electron.scanMusicFolder(lastFolder);
                if (files.length > 0) {
                    processAudioFiles(files);
                } else {
                    uploadStatus.textContent = 'No music files found in the last folder.';
                }
            }
        } catch (error) {
            console.error('Error loading last folder:', error);
        }
    }
    
    // Call this function when the application starts
    loadLastUsedFolder();
    
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
        if (!audioContext) {
            audioContext = audioEngine.audioContext;
        }
        
        if (!audioSource) {
            audioSource = audioEngine.audioSource;
        }
        
        if (!audioVisualizer && audioSource) {
            audioVisualizer = new AudioVisualizer(visualizerCanvas, audioContext, audioSource);
            
            // Initialize with waveform settings
            audioVisualizer.barWidth = 2;
            audioVisualizer.barGap = 1;
            audioVisualizer.barColor = ' #cf1c12'; // red bars
            audioVisualizer.backgroundColor = 'transparent'; //transparent background
            
            audioVisualizer.init();
        }
    }

    // Initialize audio engine
    const audioEngine = new AudioEngine();
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
        if (window.electron && typeof window.electron.updateProgress === 'function') {
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
        currentTrackName.textContent = track.name;
        currentTrackArtist.textContent = track.artist;
        
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
  
    // Helper function for notifications
    function sendTrackNotification(track) {
        const options = {
            body: `Artist: ${track.artist}`,
            icon: track.coverArt || 'path/to/default-icon.png',
            silent: true // Don't play sound with notification
        };
        
        const notification = new Notification(`Now Playing: ${track.name}`, options);
        
        // Close notification after 5 seconds
        setTimeout(() => notification.close(), 5000);
    }
    
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
    
    // Enhanced audio file processing using AudioMetadataExtractor
    function processAudioFiles(files) {
        // Clear existing library if this is first upload
        if (tracks.length === 0) {
            musicLibrary.innerHTML = '';
        }
        
        let processedCount = 0;
        const newTracks = [];
        
        files.forEach(async (file) => {
            try {
                // Use AudioMetadataExtractor to get comprehensive metadata
                const metadata = await AudioMetadataExtractor.extractMetadata(file);
                
                // Create track object with extracted metadata
                const trackData = {
                    id: tracks.length + newTracks.length,
                    name: metadata.name,
                    artist: metadata.artist,
                    album: metadata.album,
                    genre: metadata.genre,
                    year: metadata.year,
                    duration: metadata.duration,
                    coverArt: metadata.coverArt,
                    fileType: metadata.fileType,
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
                processedCount++;
                
                // Check if all files have been processed
                if (processedCount === files.length) {
                    finishLoadingTracks(newTracks);
                }
            }
        });
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
    
    // Add track to UI with support for cover art
    function addTrackToUI(trackData) {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.id = trackData.id;
        
        // Format duration using the AudioMetadataExtractor utility
        const formattedDuration = AudioMetadataExtractor.formatDuration(trackData.duration);
        
        // Prepare cover art HTML if available
        let coverHTML = '';
        if (trackData.coverArt) {
            coverHTML = `<img src="${trackData.coverArt}" class="track-cover-img" alt="Cover">`;
        }
        
        trackItem.innerHTML = `
            <div class="track-number">${trackData.id + 1}</div>
            <div class="track-cover">${coverHTML}</div>
            <div class="track-info">
                <span class="track-name">${trackData.name}</span>
                <span class="artist-name">${trackData.artist}</span>
                ${trackData.folder && trackData.folder !== 'root' ? 
                  `<span class="track-folder">Folder: ${trackData.folder}</span>` : ''}
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