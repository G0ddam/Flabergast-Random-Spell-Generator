let spellData = [];

// Fetch the spells data
fetch('./spells.json?v=' + new Date().getTime()) // Prevent caching
.then(response => {
    console.log("✅ Fetch Response:", response);
    if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
    }
    return response.json();
})
.then(data => {
    console.log("✅ Successfully loaded spells:", data);

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("❌ Error: `spells.json` is empty or not an array.");
    }

    spellData = data;

    // Ensure UI functions run *after* data loads
    const spellLevelList = document.getElementById('spellLevelList');
    if (spellLevelList) {
        spellLevelList.value = 'Cantrip';
    }

    displaySpellList();
})
.catch(error => console.error("❌ Error loading spells:", error));

function generateSpell() {
    if (!spellData || spellData.length === 0) {
        console.error("❌ Spell data not loaded yet. Try again.");
        return;
    }

    const level = document.getElementById("spellLevel")?.value ?? "Cantrip";
    const spellList = spellData.filter(spell => spell["Spell Level"] === level);

    if (spellList.length === 0) {
        console.error(`❌ No spells found for level: ${level}`);
        return;
    }

    const randomSpell = spellList[Math.floor(Math.random() * spellList.length)];

    // Safely update spell info
    document.getElementById("spellCastingTime").textContent = randomSpell["Casting Time"] ?? "Unknown";
    document.getElementById("spellConcentration").textContent = randomSpell["Requires Concentration?"] ?? "No";
    document.getElementById("spellRange").textContent = randomSpell["Range"] ?? "None";
    document.getElementById("spellDuration").textContent = randomSpell["Duration"] ?? "Unknown";
    document.getElementById("spellComponents").textContent = randomSpell["Components"] ?? "None";

    // Format multiline descriptions
    const description = randomSpell["Description"] ?? "No description available.";
    document.getElementById("spellDescription").innerHTML = description
        .split(/\n+/)
        .map(paragraph => `<p>${paragraph.trim()}</p>`)
        .join('');

    // Show spell output
    const spellOutput = document.getElementById("spellOutput");
    spellOutput.classList.add("visible");

    // Ensure box expands dynamically
    spellOutput.style.height = "auto";
    spellOutput.style.maxHeight = "none";
    spellOutput.style.overflow = "visible";
}

function displaySpellList() {
    if (!spellData || spellData.length === 0) {
        console.error("❌ Spell data not loaded yet. Try again.");
        return;
    }

    const level = document.getElementById("spellLevelList")?.value ?? "Cantrip";
    const spellList = document.getElementById("spellList");

    if (!spellList) {
        console.error("❌ Spell list container not found.");
        return;
    }

    spellList.innerHTML = '';

    const levelSpells = spellData.filter(spell => spell["Spell Level"] === level);

    if (levelSpells.length === 0) {
        spellList.innerHTML = `<p>No spells found for this level.</p>`;
        return;
    }

    levelSpells.forEach(spell => {
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

        spellList.appendChild(spellCard);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Page Loaded - Fetching spells...");

    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', () => {
            const toggles = header.nextElementSibling;
            const arrow = header.querySelector('.toggle-arrow');
            toggles.classList.toggle('collapsed');
            arrow.classList.toggle('rotated');
        });
    });

    document.getElementById('spellLevelList')?.addEventListener('change', displaySpellList);
    document.getElementById('spellSearch')?.addEventListener('input', displaySpellList);

    document.querySelectorAll('.filter-toggles input[type="checkbox"]').forEach(control => {
        control.addEventListener('change', displaySpellList);
    });

    const button = document.querySelector('.button');
    if (button) {
        button.addEventListener('click', generateSpell);
    }

    document.getElementById('spinnerPageBtn')?.addEventListener('click', () => {
        document.getElementById('spinnerPage')?.classList.add('active');
        document.getElementById('listPage')?.classList.remove('active');
    });

    document.getElementById('listPageBtn')?.addEventListener('click', () => {
        document.getElementById('listPage')?.classList.add('active');
        document.getElementById('spinnerPage')?.classList.remove('active');
    });
});