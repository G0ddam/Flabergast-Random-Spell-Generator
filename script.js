const LEVELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const CASTING_FILTERS = ['Action', 'Bonus Action', 'Reaction'];
const ROLL_CASTING_FILTERS = ['Any', ...CASTING_FILTERS];
const INITIAL_LEVEL_FILTERS = ['Cantrip', '1st', '2nd'];
const STORAGE_KEYS = {
    favorites: 'flabbergast:favorites',
    recent: 'flabbergast:recent-rolls'
};
const ICONS = {
    chaos: 'attached_assets/ui/generated/spell-vines.png',
    vines: 'attached_assets/ui/generated/spell-vines.png',
    lightning: 'attached_assets/ui/generated/spell-lightning.png',
    shield: 'attached_assets/ui/generated/spell-shield.png',
    fire: 'attached_assets/ui/generated/spell-fire.png',
    healing: 'attached_assets/ui/generated/spell-healing.png'
};

let spellData = [];
let state = {
    rollLevel: '1st',
    rollCasting: 'Any',
    levelFilters: new Set(INITIAL_LEVEL_FILTERS),
    castingFilters: new Set(CASTING_FILTERS),
    listSort: 'level',
    searchTerm: '',
    favoritesOnly: false,
    visibleLimit: 25,
    favorites: new Set(loadStoredList(STORAGE_KEYS.favorites)),
    recent: loadStoredList(STORAGE_KEYS.recent),
    activeSpellId: null
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    bindNavigation();
    bindControls();
    renderControls();
    renderFavoritesCount();
    renderRecentRolls();
    loadSpells();
});

function bindNavigation() {
    document.querySelectorAll('[data-page-target]').forEach((button) => {
        button.addEventListener('click', () => switchPage(button.dataset.pageTarget));
    });
    document.getElementById('favoritesShortcut').addEventListener('click', () => {
        state.favoritesOnly = !state.favoritesOnly;
        state.visibleLimit = 25;
        document.getElementById('favoritesShortcut').classList.toggle('active', state.favoritesOnly);
        displaySpellList();
        switchPage('listPage');
    });
    document.getElementById('recentShortcut').addEventListener('click', () => {
        document.getElementById('recentPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('settingsShortcut').addEventListener('click', () => {
        document.body.classList.toggle('compact-rows');
    });
}

function bindControls() {
    document.getElementById('randomSpellBtn').addEventListener('click', generateSpell);
    document.getElementById('clearRecentBtn').addEventListener('click', clearRecentRolls);
    document.getElementById('showAllLevelsBtn').addEventListener('click', toggleAllLevels);
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        state.visibleLimit += 25;
        displaySpellList();
    });
    document.getElementById('spellSearch').addEventListener('input', (event) => {
        state.searchTerm = event.target.value.trim().toLowerCase();
        state.visibleLimit = 25;
        displaySpellList();
    });
    document.getElementById('sortSpells').addEventListener('change', (event) => {
        state.listSort = event.target.value;
        displaySpellList();
    });
    document.getElementById('spellList').addEventListener('click', handleSpellListClick);
    document.getElementById('recentRolls').addEventListener('click', handleRecentClick);
    document.getElementById('spellOutput').addEventListener('click', handleResultClick);
}

function renderControls() {
    renderButtonGroup({
        containerId: 'spellLevelButtons',
        options: LEVELS,
        activeValue: state.rollLevel,
        label: 'Spell Level',
        onSelect: (level) => {
            state.rollLevel = level;
            renderControls();
            updateRollMessage();
        }
    });

    renderButtonGroup({
        containerId: 'rollCastingButtons',
        options: ROLL_CASTING_FILTERS,
        activeValue: state.rollCasting,
        label: 'Casting Time',
        onSelect: (castingTime) => {
            state.rollCasting = castingTime;
            renderControls();
            updateRollMessage();
        }
    });

    renderCheckboxGroup({
        containerId: 'levelFilters',
        options: LEVELS,
        selectedValues: state.levelFilters,
        onToggle: (level, checked) => {
            toggleSetValue(state.levelFilters, level, checked);
            ensureNonEmpty(state.levelFilters, level);
            state.visibleLimit = 25;
            renderControls();
            displaySpellList();
        }
    });

    renderCheckboxGroup({
        containerId: 'castingFilters',
        options: CASTING_FILTERS,
        selectedValues: state.castingFilters,
        onToggle: (castingTime, checked) => {
            toggleSetValue(state.castingFilters, castingTime, checked);
            ensureNonEmpty(state.castingFilters, castingTime);
            state.visibleLimit = 25;
            renderControls();
            displaySpellList();
        }
    });
}

function renderButtonGroup({ containerId, options, activeValue, label, onSelect }) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    options.forEach((option) => {
        const button = createElement('button', {
            type: 'button',
            class: option === activeValue ? 'segment active' : 'segment',
            'aria-pressed': option === activeValue ? 'true' : 'false',
            'aria-label': `${label}: ${option}`
        }, option);
        button.addEventListener('click', () => onSelect(option));
        container.append(button);
    });
}

function renderCheckboxGroup({ containerId, options, selectedValues, onToggle }) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    options.forEach((option) => {
        const checkbox = createElement('input', {
            type: 'checkbox',
            value: option,
            checked: selectedValues.has(option) ? '' : null
        });
        checkbox.checked = selectedValues.has(option);
        checkbox.addEventListener('change', (event) => onToggle(option, event.target.checked));

        container.append(createElement('label', { class: 'check-row' }, checkbox, createElement('span', {}, option)));
    });
}

function loadSpells() {
    fetch('./spells.json')
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Could not load spells (${response.status})`);
            }
            return response.json();
        })
        .then((data) => {
            spellData = data.map(normalizeSpell);
            state.recent = state.recent.filter((id) => getSpellById(id)).slice(0, 8);
            saveStoredList(STORAGE_KEYS.recent, state.recent);
            updateRollMessage();
            showSpell(getFeaturedSpell(), { record: false });
            displaySpellList();
            renderRecentRolls();
        })
        .catch((error) => {
            document.getElementById('rollMessage').textContent = 'The spellbook failed to open. Try running the site from a local server.';
            document.getElementById('listCount').textContent = error.message;
        });
}

function normalizeSpell(rawSpell, index) {
    const level = clean(rawSpell['Spell Level']) || 'Cantrip';
    const name = clean(rawSpell['Spell Name']) || 'Unknown Spell';
    const description = clean(rawSpell.Description) || 'No description available.';
    const base = clean(rawSpell['Base Spell']);
    const castingTime = clean(rawSpell['Casting Time']) || 'Unlisted';
    const duration = clean(rawSpell.Duration) || 'Unlisted';
    const concentration = clean(rawSpell['Requires Concentration?']) || 'No';
    const range = clean(rawSpell.Range) || rangeFallback(description);

    return {
        id: `${level}:${name}:${index}`,
        name,
        base,
        level,
        levelIndex: LEVELS.indexOf(level),
        components: clean(rawSpell.Components) || 'Unlisted',
        castingTime,
        duration,
        concentration,
        range,
        description,
        rulesVersion: clean(rawSpell['Rules Version']) || '2024',
        icon: chooseSpellIcon({ name, base, description }),
        tags: buildTags({ name, base, description, castingTime, concentration })
    };
}

function generateSpell() {
    const pool = filterForRoll();
    if (pool.length === 0) {
        document.getElementById('rollMessage').textContent = `No ${levelLabel(state.rollLevel)} spells match that casting time.`;
        return;
    }

    const randomSpell = pool[Math.floor(Math.random() * pool.length)];
    showSpell(randomSpell, { record: true, pulse: true });
}

function filterForRoll() {
    return spellData.filter((spell) => {
        const matchesLevel = spell.level === state.rollLevel;
        const matchesCasting = state.rollCasting === 'Any' || spell.castingTime === state.rollCasting;
        return matchesLevel && matchesCasting;
    });
}

function showSpell(spell, options = {}) {
    if (!spell) {
        return;
    }

    state.activeSpellId = spell.id;
    renderSpellResult(spell);
    updateRollMessage(spell);

    if (options.record) {
        state.recent = [spell.id, ...state.recent.filter((id) => id !== spell.id)].slice(0, 8);
        saveStoredList(STORAGE_KEYS.recent, state.recent);
        renderRecentRolls();
    }

    if (options.pulse) {
        const output = document.getElementById('spellOutput');
        output.classList.remove('pulse');
        requestAnimationFrame(() => output.classList.add('pulse'));
    }
}

function renderSpellResult(spell) {
    const description = splitDescription(spell.description)[0] || spell.description;

    document.getElementById('spellOutput').replaceChildren(
        createElement('div', { class: 'result-ribbon' }, 'Recently conjured'),
        createElement('img', { src: 'attached_assets/ui/generated/wax-seal.png', alt: '', class: 'wax-seal' }),
        createElement('div', { class: 'result-body' },
            createElement('img', { src: spell.icon, alt: '', class: 'result-icon' }),
            createElement('div', { class: 'result-heading' },
                createElement('h2', { id: 'spellName' }, spell.name),
                createElement('p', { class: 'spell-school' }, `${levelLabel(spell.level)} chaos magic`),
                renderTagRow(spell.tags)
            )
        ),
        createElement('div', { class: 'result-description' },
            createElement('p', {}, truncate(description, 330))
        ),
        createElement('div', { class: 'result-statbar' },
            createMetaItem('✣', 'Casting Time', spell.castingTime),
            createMetaItem('◎', 'Range', spell.range),
            createMetaItem('⌛', 'Duration', spell.duration),
            createMetaItem('◊', 'Components', spell.components)
        ),
        createElement('div', { class: 'result-actions' },
            createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'favorite', 'data-spell-id': spell.id }, state.favorites.has(spell.id) ? '★ Favorited' : '☆ Add to Favorites'),
            createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'view-active' }, '▤ View in List'),
            createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'roll-again' }, '↻ Roll Again')
        )
    );
}

function displaySpellList() {
    const list = document.getElementById('spellList');
    if (!spellData.length) {
        list.replaceChildren();
        return;
    }

    const filteredSpells = getFilteredSpells();
    const visibleSpells = filteredSpells.slice(0, state.visibleLimit);
    document.getElementById('listCount').textContent = `Showing ${visibleSpells.length} of ${filteredSpells.length} spells`;

    if (filteredSpells.length === 0) {
        list.replaceChildren(
            createElement('div', { class: 'empty-list' },
                createElement('h3', {}, 'No spells found'),
                createElement('p', {}, 'Loosen a filter or try a different incantation.')
            )
        );
        document.getElementById('loadMoreBtn').hidden = true;
        return;
    }

    list.replaceChildren(...visibleSpells.map(renderSpellRow));
    document.getElementById('loadMoreBtn').hidden = visibleSpells.length >= filteredSpells.length;
}

function getFilteredSpells() {
    return [...spellData]
        .filter((spell) => {
            const matchesLevel = state.levelFilters.has(spell.level);
            const matchesCasting = state.castingFilters.has(spell.castingTime);
            const matchesFavorite = !state.favoritesOnly || state.favorites.has(spell.id);
            const haystack = `${spell.name} ${spell.base} ${spell.description}`.toLowerCase();
            const matchesSearch = !state.searchTerm || haystack.includes(state.searchTerm);
            return matchesLevel && matchesCasting && matchesFavorite && matchesSearch;
        })
        .sort(compareSpells);
}

function compareSpells(a, b) {
    if (state.listSort === 'name') {
        return a.name.localeCompare(b.name);
    }
    if (state.listSort === 'casting') {
        return a.castingTime.localeCompare(b.castingTime) || a.name.localeCompare(b.name);
    }
    if (state.listSort === 'duration') {
        return a.duration.localeCompare(b.duration) || a.name.localeCompare(b.name);
    }
    return a.levelIndex - b.levelIndex || a.name.localeCompare(b.name);
}

function renderSpellRow(spell) {
    return createElement('article', { class: 'spell-row', 'data-spell-id': spell.id },
        createElement('div', { class: 'spell-row-title' },
            createElement('img', { src: spell.icon, alt: '', class: 'spell-thumb' }),
            createElement('div', {},
                createElement('h3', {}, spell.name),
                createElement('p', {}, `${levelLabel(spell.level)}${spell.base ? ` from ${spell.base}` : ''}`)
            )
        ),
        renderTagRow(spell.tags),
        createElement('div', { class: 'row-meta' },
            createElement('span', {}, `✣ ${spell.castingTime}`),
            createElement('span', {}, `◎ ${spell.range}`),
            createElement('span', {}, `⌛ ${spell.duration}`)
        ),
        createElement('div', { class: 'row-actions' },
            createElement('button', {
                type: 'button',
                class: `star-button${state.favorites.has(spell.id) ? ' active' : ''}`,
                'data-action': 'favorite',
                'data-spell-id': spell.id,
                'aria-label': state.favorites.has(spell.id) ? `Remove ${spell.name} from favorites` : `Add ${spell.name} to favorites`
            }, state.favorites.has(spell.id) ? '★' : '☆')
        )
    );
}

function renderTagRow(tags) {
    return createElement('div', { class: 'tag-row' }, ...tags.map((tag) => createElement('span', {}, tag)));
}

function renderRecentRolls() {
    const recentContainer = document.getElementById('recentRolls');
    const recentSpells = state.recent.map(getSpellById).filter(Boolean);

    if (recentSpells.length === 0) {
        recentContainer.replaceChildren(createElement('p', { class: 'recent-empty' }, 'No rolls yet.'));
        return;
    }

    recentContainer.replaceChildren(...recentSpells.map((spell) => (
        createElement('button', { type: 'button', class: 'recent-pill', 'data-action': 'show-recent', 'data-spell-id': spell.id },
            createElement('strong', {}, spell.name),
            createElement('span', {}, `${spell.level} · ${spell.castingTime}`)
        )
    )));
}

function handleSpellListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (button) {
        const spell = getSpellById(button.dataset.spellId || state.activeSpellId);
        if (!spell) {
            return;
        }
        if (button.dataset.action === 'favorite') {
            toggleFavorite(spell.id);
        }
        return;
    }

    const row = event.target.closest('.spell-row[data-spell-id]');
    if (row) {
        openSpellFromList(row.dataset.spellId);
    }
}

function openSpellFromList(spellId) {
    const spell = getSpellById(spellId);
    if (!spell) {
        return;
    }
    state.rollLevel = spell.level;
    state.rollCasting = 'Any';
    showSpell(spell, { record: true, pulse: true });
    renderControls();
    switchPage('spinnerPage');
}

function handleRecentClick(event) {
    const button = event.target.closest('button[data-action="show-recent"]');
    if (!button) {
        return;
    }
    const spell = getSpellById(button.dataset.spellId);
    showSpell(spell, { record: false, pulse: true });
    switchPage('spinnerPage');
}

function handleResultClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) {
        return;
    }

    const spell = getSpellById(button.dataset.spellId || state.activeSpellId);
    if (!spell) {
        return;
    }

    if (button.dataset.action === 'favorite') {
        toggleFavorite(spell.id);
    }
    if (button.dataset.action === 'view-active') {
        state.levelFilters = new Set([spell.level]);
        state.searchTerm = spell.name.toLowerCase();
        state.visibleLimit = 25;
        document.getElementById('spellSearch').value = spell.name;
        renderControls();
        displaySpellList();
        switchPage('listPage');
    }
    if (button.dataset.action === 'roll-again') {
        generateSpell();
    }
}

function toggleFavorite(spellId) {
    if (state.favorites.has(spellId)) {
        state.favorites.delete(spellId);
    } else {
        state.favorites.add(spellId);
    }
    saveStoredList(STORAGE_KEYS.favorites, [...state.favorites]);
    renderFavoritesCount();
    const activeSpell = getSpellById(state.activeSpellId);
    if (activeSpell) {
        renderSpellResult(activeSpell);
    }
    displaySpellList();
}

function renderFavoritesCount() {
    document.getElementById('favoriteCount').textContent = state.favorites.size.toString();
}

function switchPage(pageId) {
    document.querySelectorAll('[data-page-target]').forEach((button) => {
        const isActive = button.dataset.pageTarget === pageId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    document.getElementById(pageId).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleAllLevels() {
    if (state.levelFilters.size === LEVELS.length) {
        state.levelFilters = new Set(INITIAL_LEVEL_FILTERS);
        document.getElementById('showAllLevelsBtn').textContent = 'Show more⌄';
    } else {
        state.levelFilters = new Set(LEVELS);
        document.getElementById('showAllLevelsBtn').textContent = 'Show less⌃';
    }
    state.visibleLimit = 25;
    renderControls();
    displaySpellList();
}

function clearRecentRolls() {
    state.recent = [];
    saveStoredList(STORAGE_KEYS.recent, state.recent);
    renderRecentRolls();
}

function updateRollMessage(spell) {
    if (!spellData.length) {
        return;
    }
    if (spell) {
        document.getElementById('rollMessage').textContent = `${spell.name} answered the call.`;
        return;
    }
    const pool = filterForRoll();
    document.getElementById('rollMessage').textContent = `${pool.length} ${levelLabel(state.rollLevel).toLowerCase()} options in the current cauldron.`;
}

function createMetaItem(icon, label, value) {
    return createElement('div', { class: 'meta-item' },
        createElement('span', { 'aria-hidden': 'true' }, icon),
        createElement('small', {}, label),
        createElement('strong', {}, value)
    );
}

function getFeaturedSpell() {
    return spellData.find((spell) => /clump|plant|vine|root|growth|nature/i.test(`${spell.name} ${spell.base} ${spell.description}`))
        || spellData.find((spell) => spell.level === '1st')
        || spellData[0];
}

function getSpellById(id) {
    return spellData.find((spell) => spell.id === id);
}

function chooseSpellIcon({ name, base, description }) {
    const text = `${name} ${base} ${description}`.toLowerCase();
    if (/entangle|clump|vine|root|plant|growth|nature|tree|wood|thorn/.test(text)) return ICONS.vines;
    if (/fire|burn|flame|heat|frosting/.test(text)) return ICONS.fire;
    if (/thunder|lightning|storm|spark|wave/.test(text)) return ICONS.lightning;
    if (/shield|armor|ward|protect|defen/.test(text)) return ICONS.shield;
    if (/heal|cure|life|wound/.test(text)) return ICONS.healing;
    return ICONS.chaos;
}

function buildTags({ name, base, description, castingTime, concentration }) {
    const text = `${name} ${base} ${description}`.toLowerCase();
    const tags = [];
    const add = (tag) => {
        if (!tags.includes(tag) && tags.length < 4) tags.push(tag);
    };

    if (/fire|burn|flame|damage|thunder|frost|slap|missile/.test(text)) add('Damage');
    if (/shield|armor|ward|protect|defen/.test(text)) add('Defense');
    if (/charm|illusion|disguise|hideous|mind|thought/.test(text)) add('Illusion');
    if (/move|push|restrain|immobil|prone|control|clump/.test(text)) add('Control');
    if (/plant|vine|root|nature|tree|wood|thorn/.test(text)) add('Nature');
    if (/heal|cure|life|wound/.test(text)) add('Healing');
    if (concentration === 'Yes') add('Focus');
    if (castingTime === 'Reaction') add('Reaction');
    if (castingTime === 'Bonus Action') add('Swift');
    add('Chaos');
    return tags;
}

function rangeFallback(description) {
    const match = description.match(/\b(\d+\s?(?:ft|foot|feet)|self|touch)\b/i);
    return match ? match[0].replace(/^self$/i, 'Self') : 'See text';
}

function levelLabel(level) {
    if (level === 'Cantrip') {
        return 'Cantrip';
    }
    return `${level}-level`;
}

function toggleSetValue(set, value, checked) {
    if (checked) {
        set.add(value);
    } else {
        set.delete(value);
    }
}

function ensureNonEmpty(set, fallback) {
    if (set.size === 0) {
        set.add(fallback);
    }
}

function splitDescription(description) {
    return description.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function truncate(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength).trim()}...`;
}

function clean(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).trim();
}

function loadStoredList(key) {
    try {
        const value = localStorage.getItem(key);
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveStoredList(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Local storage is optional; the app still works without it.
    }
}

function createElement(tagName, attributes = {}, ...children) {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([name, value]) => {
        if (value === null || value === undefined) {
            return;
        }
        element.setAttribute(name, value);
    });
    children.flat().forEach((child) => {
        if (child === null || child === undefined) {
            return;
        }
        element.append(child instanceof Node ? child : document.createTextNode(child));
    });
    return element;
}
