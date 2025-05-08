let url = web();

async function fetchData() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        document.getElementById('track-name').textContent = data.shortenedName;
        document.getElementById('track-name').href = data.link;

        document.getElementById('album-cover').src = data.image;

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

        const progressText = document.getElementById('progress-text');
        const minutes = Math.floor(data.progress_ms / 60000);
        const seconds = Math.floor((data.progress_ms % 60000) / 1000);
        progressText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / ${Math.floor(data.duration_ms / 60000)}:${Math.floor((data.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`;

        document.getElementById('widget-container').style.display = 'block';

    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
    }
}

setInterval(fetchData, 1000);
window.onload = fetchData;