const spells = {
    1: [
        { name: "Fire Hands", effect: "Shoots flames from the fingertips." },
        { name: "Ice Breath", effect: "Exhales a blast of frost." }
    ],
    2: [
        { name: "Thunder Step", effect: "Teleport with a booming sound." },
        { name: "Lightning Fingers", effect: "Emit lightning from your fingers." }
    ],
    3: [
        { name: "Storm Call", effect: "Summons a localized storm." },
        { name: "Earthquake", effect: "Causes the ground to tremble." }
    ]
    // Add more levels and spells as needed
};

function generateSpell() {
    const level = document.getElementById("spellLevel").value;
    const spellList = spells[level];
    const randomSpell = spellList[Math.floor(Math.random() * spellList.length)];
    document.getElementById("spellName").textContent = randomSpell.name;
    document.getElementById("spellEffect").textContent = randomSpell.effect;
}
