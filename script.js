const LEVELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const CASTING_FILTERS = ['Any', 'Action', 'Bonus Action', 'Reaction'];
const STORAGE_KEYS = {
    favorites: 'flabbergast:favorites',
    recent: 'flabbergast:recent-rolls'
};

let spellData = [];
let state = {
    page: 'spinnerPage',
    rollLevel: 'Cantrip',
    rollCasting: 'Any',
    listLevel: 'All',
    listCasting: 'Any',
    listSort: 'level',
    searchTerm: '',
    favoritesOnly: false,
    favorites: new Set(loadStoredList(STORAGE_KEYS.favorites)),
    recent: loadStoredList(STORAGE_KEYS.recent),
    activeSpellId: null
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    bindNavigation();
    bindLibraryControls();
    renderStaticControls();
    renderFavoritesCount();
    renderRecentRolls();
    loadSpells();
});

function bindNavigation() {
    document.querySelectorAll('[data-page-target]').forEach((button) => {
        button.addEventListener('click', () => switchPage(button.dataset.pageTarget));
    });
}

function bindLibraryControls() {
    document.getElementById('randomSpellBtn').addEventListener('click', generateSpell);
    document.getElementById('clearRecentBtn').addEventListener('click', clearRecentRolls);
    document.getElementById('clearFiltersBtn').addEventListener('click', resetFilters);
    document.getElementById('spellSearch').addEventListener('input', (event) => {
        state.searchTerm = event.target.value.trim().toLowerCase();
        displaySpellList();
    });
    document.getElementById('spellLevelList').addEventListener('change', (event) => {
        state.listLevel = event.target.value;
        displaySpellList();
    });
    document.getElementById('sortSpells').addEventListener('change', (event) => {
        state.listSort = event.target.value;
        displaySpellList();
    });
    document.getElementById('favoritesOnly').addEventListener('change', (event) => {
        state.favoritesOnly = event.target.checked;
        displaySpellList();
    });
    document.getElementById('spellList').addEventListener('click', handleSpellListClick);
    document.getElementById('recentRolls').addEventListener('click', handleRecentClick);
    document.getElementById('spellOutput').addEventListener('click', handleResultClick);
}

function renderStaticControls() {
    renderButtonGroup({
        containerId: 'spellLevelButtons',
        options: LEVELS,
        activeValue: state.rollLevel,
        label: 'Spell Level',
        onSelect: (level) => {
            state.rollLevel = level;
            renderStaticControls();
            updateRollMessage();
        }
    });

    renderButtonGroup({
        containerId: 'rollCastingButtons',
        options: CASTING_FILTERS,
        activeValue: state.rollCasting,
        label: 'Casting Time',
        onSelect: (castingTime) => {
            state.rollCasting = castingTime;
            renderStaticControls();
            updateRollMessage();
        }
    });

    renderButtonGroup({
        containerId: 'listCastingButtons',
        options: CASTING_FILTERS,
        activeValue: state.listCasting,
        label: 'Casting Time',
        onSelect: (castingTime) => {
            state.listCasting = castingTime;
            renderStaticControls();
            displaySpellList();
        }
    });

    const levelSelect = document.getElementById('spellLevelList');
    levelSelect.replaceChildren(
        createElement('option', { value: 'All' }, 'All levels'),
        ...LEVELS.map((level) => createElement('option', { value: level }, levelLabel(level)))
    );
    levelSelect.value = state.listLevel;
}

function renderButtonGroup({ containerId, options, activeValue, label, onSelect }) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    options.forEach((option) => {
        const button = createElement(
            'button',
            {
                type: 'button',
                class: option === activeValue ? 'segment active' : 'segment',
                'aria-pressed': option === activeValue ? 'true' : 'false',
                'aria-label': `${label}: ${option}`
            },
            option === 'Any' ? 'Any' : option
        );
        button.addEventListener('click', () => onSelect(option));
        container.append(button);
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
            document.getElementById('spellTotal').textContent = spellData.length.toString();
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
    return {
        id: `${level}:${name}:${index}`,
        name,
        base: clean(rawSpell['Base Spell']),
        level,
        levelIndex: LEVELS.indexOf(level),
        components: clean(rawSpell.Components) || 'Unlisted',
        castingTime: clean(rawSpell['Casting Time']) || 'Unlisted',
        duration: clean(rawSpell.Duration) || 'Unlisted',
        concentration: clean(rawSpell['Requires Concentration?']) || 'No',
        range: clean(rawSpell.Range) || 'See description',
        description: clean(rawSpell.Description) || 'No description available.',
        rulesVersion: clean(rawSpell['Rules Version']) || '2024'
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
    const favoriteButton = createFavoriteButton(spell, 'result-favorite');
    const heading = createElement('div', { class: 'result-title' },
        createElement('div', {},
            createElement('p', { class: 'spell-school' }, `${levelLabel(spell.level)} chaos magic`),
            createElement('h2', { id: 'spellName' }, spell.name)
        ),
        favoriteButton
    );

    const description = createElement('div', { class: 'spell-description rich-text' });
    splitDescription(spell.description).forEach((paragraph) => {
        description.append(createElement('p', {}, paragraph));
    });

    const actions = createElement('div', { class: 'result-actions' },
        createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'copy-active' }, 'Copy spell'),
        createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'view-active' }, 'View in list'),
        createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'roll-again' }, 'Roll again')
    );

    document.getElementById('spellOutput').replaceChildren(
        heading,
        createElement('div', { class: 'spell-summary' },
            createMetaItem('Casting Time', spell.castingTime),
            createMetaItem('Range', spell.range),
            createMetaItem('Duration', spell.duration),
            createMetaItem('Components', spell.components),
            createMetaItem('Concentration', spell.concentration),
            createMetaItem('Base Spell', spell.base || 'Original chaos')
        ),
        description,
        actions
    );
}

function displaySpellList() {
    const list = document.getElementById('spellList');
    if (!spellData.length) {
        list.replaceChildren();
        return;
    }

    const filteredSpells = getFilteredSpells();
    document.getElementById('listCount').textContent = `${filteredSpells.length} of ${spellData.length} spells shown`;

    if (filteredSpells.length === 0) {
        list.replaceChildren(
            createElement('div', { class: 'empty-list' },
                createElement('h3', {}, 'No spells found'),
                createElement('p', {}, 'Loosen a filter or try a different incantation.')
            )
        );
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredSpells.forEach((spell) => {
        fragment.append(renderSpellRow(spell));
    });
    list.replaceChildren(fragment);
}

function getFilteredSpells() {
    return [...spellData]
        .filter((spell) => {
            const matchesLevel = state.listLevel === 'All' || spell.level === state.listLevel;
            const matchesCasting = state.listCasting === 'Any' || spell.castingTime === state.listCasting;
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
    const row = createElement('article', { class: 'spell-row', 'data-spell-id': spell.id });
    const title = createElement('div', { class: 'spell-row-title' },
        createElement('div', { class: 'spell-sigil', 'aria-hidden': 'true' }, spell.name.charAt(0)),
        createElement('div', {},
            createElement('h3', {}, spell.name),
            createElement('p', {}, `${levelLabel(spell.level)}${spell.base ? ` from ${spell.base}` : ''}`)
        )
    );

    const quickMeta = createElement('div', { class: 'row-meta' },
        createElement('span', {}, spell.castingTime),
        createElement('span', {}, spell.range),
        createElement('span', {}, spell.duration),
        createElement('span', {}, spell.concentration === 'Yes' ? 'Concentration' : 'No concentration')
    );

    const snippet = createElement('p', { class: 'spell-snippet' }, truncate(spell.description, 210));
    const controls = createElement('div', { class: 'row-actions' },
        createFavoriteButton(spell, 'icon-button'),
        createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'roll-spell', 'data-spell-id': spell.id }, 'Roll this'),
        createElement('button', { type: 'button', class: 'secondary-button', 'data-action': 'open-spell', 'data-spell-id': spell.id }, 'Open')
    );

    row.append(title, quickMeta, snippet, controls);
    return row;
}

function renderRecentRolls() {
    const recentContainer = document.getElementById('recentRolls');
    const recentSpells = state.recent.map(getSpellById).filter(Boolean);

    if (recentSpells.length === 0) {
        recentContainer.replaceChildren(
            createElement('p', { class: 'recent-empty' }, 'No rolls yet. The first one gets the dramatic lighting.')
        );
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
    if (button.dataset.action === 'roll-spell') {
        state.rollLevel = spell.level;
        state.rollCasting = 'Any';
        showSpell(spell, { record: true, pulse: true });
        renderStaticControls();
        switchPage('spinnerPage');
    }
    if (button.dataset.action === 'open-spell') {
        showSpell(spell, { record: true, pulse: true });
        switchPage('spinnerPage');
    }
}

function handleRecentClick(event) {
    const button = event.target.closest('button[data-action="show-recent"]');
    if (!button) {
        return;
    }
    const spell = getSpellById(button.dataset.spellId);
    showSpell(spell, { record: false, pulse: true });
}

function handleResultClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) {
        return;
    }

    const spell = getSpellById(state.activeSpellId);
    if (!spell) {
        return;
    }

    if (button.dataset.action === 'favorite') {
        toggleFavorite(spell.id);
    }
    if (button.dataset.action === 'copy-active') {
        copySpell(spell);
    }
    if (button.dataset.action === 'view-active') {
        state.listLevel = spell.level;
        state.searchTerm = spell.name.toLowerCase();
        document.getElementById('spellSearch').value = spell.name;
        renderStaticControls();
        displaySpellList();
        switchPage('listPage');
    }
    if (button.dataset.action === 'roll-again') {
        generateSpell();
    }
}

function createFavoriteButton(spell, className) {
    const isFavorite = state.favorites.has(spell.id);
    return createElement(
        'button',
        {
            type: 'button',
            class: `${className} favorite-button${isFavorite ? ' active' : ''}`,
            'data-action': 'favorite',
            'data-spell-id': spell.id,
            'aria-pressed': isFavorite ? 'true' : 'false',
            'aria-label': isFavorite ? `Remove ${spell.name} from favorites` : `Add ${spell.name} to favorites`
        },
        isFavorite ? '★' : '☆'
    );
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

function copySpell(spell) {
    const text = `${spell.name}\n${levelLabel(spell.level)} chaos magic\nCasting Time: ${spell.castingTime}\nRange: ${spell.range}\nDuration: ${spell.duration}\nComponents: ${spell.components}\n\n${spell.description}`;
    if (!navigator.clipboard) {
        document.getElementById('rollMessage').textContent = 'Copy is unavailable in this browser.';
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => {
            document.getElementById('rollMessage').textContent = `${spell.name} copied to your notes.`;
        })
        .catch(() => {
            document.getElementById('rollMessage').textContent = 'Copy is unavailable in this browser.';
        });
}

function switchPage(pageId) {
    state.page = pageId;
    document.querySelectorAll('.page').forEach((page) => {
        page.classList.toggle('active', page.id === pageId);
    });
    document.querySelectorAll('[data-page-target]').forEach((button) => {
        const isActive = button.dataset.pageTarget === pageId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function resetFilters() {
    state.listLevel = 'All';
    state.listCasting = 'Any';
    state.listSort = 'level';
    state.searchTerm = '';
    state.favoritesOnly = false;
    document.getElementById('spellSearch').value = '';
    document.getElementById('sortSpells').value = 'level';
    document.getElementById('favoritesOnly').checked = false;
    renderStaticControls();
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

function createMetaItem(label, value) {
    return createElement('div', { class: 'meta-item' },
        createElement('span', {}, label),
        createElement('strong', {}, value)
    );
}

function getFeaturedSpell() {
    return spellData.find((spell) => spell.level === 'Cantrip') || spellData[0];
}

function getSpellById(id) {
    return spellData.find((spell) => spell.id === id);
}

function levelLabel(level) {
    if (level === 'All') {
        return 'All levels';
    }
    if (level === 'Cantrip') {
        return 'Cantrip';
    }
    return `${level} level`;
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
        // Local storage is a convenience only; the generator still works without it.
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
