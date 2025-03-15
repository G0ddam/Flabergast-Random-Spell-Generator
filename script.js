
// Global variable to store spell data
let spellData = [];

// Event listener for when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Page Loaded - Fetching spells...");
    
    // Add event listeners for page switching
    document.getElementById('spinnerPageBtn').addEventListener('click', () => {
        document.getElementById('spinnerPage').classList.add('active');
        document.getElementById('listPage').classList.remove('active');
        document.getElementById('spinnerPageBtn').classList.add('active');
        document.getElementById('listPageBtn').classList.remove('active');
    });

    document.getElementById('listPageBtn').addEventListener('click', () => {
        document.getElementById('listPage').classList.add('active');
        document.getElementById('spinnerPage').classList.remove('active');
        document.getElementById('listPageBtn').classList.add('active');
        document.getElementById('spinnerPageBtn').classList.remove('active');
    });

    // Add event listener for the Flabbergast button
    const button = document.querySelector('.button');
    if (button) {
        button.addEventListener('click', generateSpell);
    }

    // Add event listeners for spell list controls
    document.getElementById('spellLevelList')?.addEventListener('change', displaySpellList);
    document.getElementById('spellSearch')?.addEventListener('input', displaySpellList);
    
    document.querySelectorAll('.filter-toggles input[type="checkbox"]').forEach(control => {
        control.addEventListener('change', displaySpellList);
    });

    // Fetch spell data
    fetch('./spells.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ Successfully loaded spells:", data);
            spellData = data;
            displaySpellList();
        })
        .catch(error => console.error("❌ Error loading spells:", error));
});

function generateSpell() {
    if (!spellData || spellData.length === 0) {
        console.error("❌ No spell data available");
        return;
    }

    const level = document.getElementById("spellLevel").value;
    const spellList = spellData.filter(spell => spell["Spell Level"] === level);

    if (spellList.length === 0) {
        console.error(`❌ No spells found for level: ${level}`);
        return;
    }

    const randomSpell = spellList[Math.floor(Math.random() * spellList.length)];

    document.getElementById("spellName").textContent = randomSpell["Spell Name"] || "Unknown Spell";
    document.getElementById("spellCastingTime").textContent = randomSpell["Casting Time"] || "Unknown";
    document.getElementById("spellConcentration").textContent = randomSpell["Requires Concentration?"] || "No";
    document.getElementById("spellRange").textContent = randomSpell["Range"] || "None";
    document.getElementById("spellDuration").textContent = randomSpell["Duration"] || "Unknown";
    document.getElementById("spellComponents").textContent = randomSpell["Components"] || "None";
    
    const description = randomSpell["Description"] || "No description available.";
    document.getElementById("spellDescription").innerHTML = description
        .split(/\n+/)
        .map(paragraph => `<p>${paragraph.trim()}</p>`)
        .join('');

    document.getElementById("spellOutput").classList.add("visible");
}

function displaySpellList() {
    if (!spellData || spellData.length === 0) {
        return;
    }

    const level = document.getElementById("spellLevelList").value;
    const searchTerm = document.getElementById("spellSearch").value.toLowerCase();
    const spellListContainer = document.getElementById("spellList");
    
    spellListContainer.innerHTML = '';

    const filteredSpells = spellData.filter(spell => 
        spell["Spell Level"] === level &&
        (!searchTerm || spell["Spell Name"]?.toLowerCase().includes(searchTerm))
    );

    if (filteredSpells.length === 0) {
        spellListContainer.innerHTML = '<p>No spells found matching your criteria.</p>';
        return;
    }

    filteredSpells.forEach(spell => {
        const spellCard = document.createElement('div');
        spellCard.className = 'spell-card';
        
        const description = spell["Description"] || "No description available.";
        const formattedDescription = description
            .split('\n')
            .filter(para => para.trim() !== '')
            .map(paragraph => `<p>${paragraph.trim()}</p>`)
            .join('');

        spellCard.innerHTML = `
            <h2>${spell["Spell Name"] || "Unknown"}</h2>
            <div class="spell-metadata">
                <p><strong>Components:</strong> ${spell["Components"] || "None"}</p>
                <p><strong>Casting Time:</strong> ${spell["Casting Time"] || "Unknown"}</p>
                <p><strong>Duration:</strong> ${spell["Duration"] || "Unknown"}</p>
                <p><strong>Concentration:</strong> ${spell["Requires Concentration?"] || "No"}</p>
                <p><strong>Range:</strong> ${spell["Range"] || "None"}</p>
            </div>
            <div class="spell-description">
                <h3>Description</h3>
                ${formattedDescription}
            </div>
        `;

        spellListContainer.appendChild(spellCard);
    });
}
