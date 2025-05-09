function timeAgo(timestamp) {
    let text = "Latest activity: "
    const units = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "week", seconds: 604800 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
    ];
  
    const secondsElapsed = Math.floor(timestamp / 1000);
  
    if (secondsElapsed < 60) {
        return text + "less than a minute ago";
    }
  
    for (const unit of units) {
        const interval = Math.floor(secondsElapsed / unit.seconds);
        if (interval >= 1) {
            return text + `${interval} ${unit.label}${interval > 1 ? "s" : ""} ago`;
        }
    }
}

async function fetchData() {
    try {
        const response = await fetch("https://anthropium--d6099faf39bd4c35a48f274fb4accc61.web.val.run");
        const data = await response.json();

        document.getElementById('track-name').textContent = data.shortenedName;
        document.getElementById('last-activity-timestamp').textContent = `${timeAgo(data.elapsedTimeSinceActivity_ms)}`;
        document.getElementById('track-name').href = data.link;

        if (data.isplaying == true) {
            document.getElementById('album-cover').src = data.image;
            const progressText = document.getElementById('progress-text');
            const minutes = Math.floor(data.progress_ms / 60000);
            const seconds = Math.floor((data.progress_ms % 60000) / 1000);
            progressText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / ${Math.floor(data.duration_ms / 60000)}:${Math.floor((data.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`;
            const artistContainer = document.getElementById('artist-names');
            artistContainer.innerHTML = '';
            data.artistNames.forEach((artist, index) => {
                const artistLink = document.createElement('a');
                artistLink.href = data.artistLinks[index];
                artistLink.textContent = artist;
                artistLink.target = '_blank';
                artistLink.classList.add('text-lg', 'text-gray-600', 'hover:underline');
                artistContainer.appendChild(artistLink);
                if (index < data.artistNames.length - 1) {
                    artistContainer.appendChild(document.createTextNode(', '));
                }
            });

            const progressBar = document.getElementById('custom-progress');
            if (data.duration_ms > 0) {
                const percent = (data.progress_ms / data.duration_ms) * 100;
                progressBar.style.width = `${percent}%`;
            }
        } else {
            document.getElementById('album-cover').src = 'assets/spotify.svg';
            document.getElementById('progress-text').textContent = '-:-- / -:--';
            document.getElementById('artist-names').textContent = "n/A";
            document.getElementById('custom-progress').style.width = `0%`;
        }

        


        

        document.getElementById('widget-container').style.display = 'block';

    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
    }
}

setInterval(fetchData, 1000);
window.onload = fetchData;