// Enhanced Audio Metadata Extractor
class AudioMetadataExtractor {
    /**
     * Attempts to extract metadata from an audio file
     * 
     * @param {File} file - The audio file
     * @param {string} dataUrl - Data URL of the audio file (optional)
     * @returns {Promise<Object>} - Promise resolving to metadata object
     */
    static async extractMetadata(file, dataUrl = null) {
        // Base metadata object
        const metadata = {
            name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            genre: 'Unknown Genre',
            year: null,
            duration: 0,
            fileType: file.type,
            fileSize: file.size,
            lastModified: new Date(file.lastModified),
            coverArt: null
        };
        
        try {
            // Try to extract from filename (basic method)
            this.extractFromFilename(metadata);
            
            // Extract duration using Audio API
            if (!dataUrl) {
                dataUrl = await this.fileToDataURL(file);
            }
            
            const duration = await this.extractDuration(dataUrl);
            if (duration) {
                metadata.duration = duration;
            }
            
            // Extract ID3 tags for MP3s
            if (file.type === 'audio/mpeg') {
                try {
                    const tags = await this.extractID3Tags(file);
                    if (tags) {
                        // Only override if valid data is found
                        if (tags.title) metadata.name = tags.title;
                        if (tags.artist) metadata.artist = tags.artist;
                        if (tags.album) metadata.album = tags.album;
                        if (tags.genre) metadata.genre = tags.genre;
                        if (tags.year) metadata.year = tags.year;
                        if (tags.picture) metadata.coverArt = this.processID3Picture(tags.picture);
                    }
                } catch (tagError) {
                    console.warn('Error extracting ID3 tags:', tagError);
                    // Continue with basic metadata on ID3 extraction error
                }
            }
            
            // Extract metadata for other audio formats
            else if (file.type === 'audio/flac' || file.type === 'audio/ogg' || 
                    file.type === 'audio/wav' || file.type === 'audio/mp4') {
                // For these formats, we could implement additional extraction methods
                // Currently we'll rely on basic extraction methods
                console.log(`Using basic extraction for ${file.type} file`);
            }
            
            return metadata;
        } catch (error) {
            console.error('Error extracting metadata:', error);
            return metadata; // Return basic metadata on error
        }
    }
    
    /**
     * Extract information from filename
     * Common patterns:
     * - Artist - Title
     * - Artist - Album - Title
     * - [Album] Artist - Title
     * - (Year) Artist - Title
     */
    static extractFromFilename(metadata) {
        // Remove file extension if present
        let filename = metadata.name;
        
        // Match "[Album] Artist - Title" pattern
        let albumMatch = filename.match(/^\[(.*?)\](.*?)-(.*?)$/);
        if (albumMatch) {
            metadata.album = albumMatch[1].trim();
            metadata.artist = albumMatch[2].trim();
            metadata.name = albumMatch[3].trim();
            return;
        }
        
        // Match "(Year) Artist - Title" pattern
        let yearMatch = filename.match(/^\((\d{4})\)(.*?)-(.*?)$/);
        if (yearMatch) {
            metadata.year = parseInt(yearMatch[1].trim());
            metadata.artist = yearMatch[2].trim();
            metadata.name = yearMatch[3].trim();
            return;
        }
        
        // Match "Artist - Album - Title" pattern
        let parts = filename.split(' - ');
        if (parts.length > 2) {
            metadata.artist = parts[0].trim();
            metadata.album = parts[1].trim();
            metadata.name = parts.slice(2).join(' - ').trim();
            return;
        }
        
        // Match "Artist - Title" pattern (most common)
        if (parts.length === 2) {
            metadata.artist = parts[0].trim();
            metadata.name = parts[1].trim();
            return;
        }
    }
    
    /**
     * Convert File object to Data URL
     */
    static fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = (e) => {
                reject(e);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Extract audio duration using HTML5 Audio API
     */
    static extractDuration(dataUrl) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.onloadedmetadata = () => {
                resolve(audio.duration);
            };
            
            audio.onerror = (e) => {
                console.warn('Error loading audio for duration extraction:', e);
                resolve(0); // Resolve with 0 rather than rejecting
            };
            
            audio.src = dataUrl;
        });
    }
    
    /**
     * Extract ID3 tags from MP3 file using the jsmediatags library
     * Note: Requires the jsmediatags library to be included in the project
     */
    static extractID3Tags(file) {
        return new Promise((resolve, reject) => {
            // Check if jsmediatags is available
            if (typeof jsmediatags === 'undefined') {
                reject(new Error('jsmediatags library not found'));
                return;
            }
            
            jsmediatags.read(file, {
                onSuccess: function(tag) {
                    const tags = tag.tags;
                    
                    // Extract the relevant metadata
                    const metadata = {
                        title: tags.title,
                        artist: tags.artist,
                        album: tags.album,
                        genre: tags.genre,
                        year: tags.year,
                        picture: tags.picture
                    };
                    
                    resolve(metadata);
                },
                onError: function(error) {
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Process ID3 picture data into a usable format
     */
    static processID3Picture(pictureData) {
        if (!pictureData) return null;
        
        // Convert the picture data to a data URL
        const { data, format } = pictureData;
        
        if (!data || !format) return null;
        
        // Convert the array buffer to a base64 string
        let base64String = '';
        for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
        }
        
        // Create a data URL
        const dataUrl = `data:${format};base64,${btoa(base64String)}`;
        return dataUrl;
    }
    
    /**
     * Format duration string (static utility method)
     * @param {number} seconds - Duration in seconds
     * @returns {string} - Formatted time string (mm:ss or hh:mm:ss for longer tracks)
     */
    static formatDuration(seconds) {
        if (isNaN(seconds) || seconds === null) return '0:00';
        
        // Handle tracks longer than an hour
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Format file size (static utility method)
     * @param {number} bytes - Size in bytes
     * @returns {string} - Formatted size string
     */
    static formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
}