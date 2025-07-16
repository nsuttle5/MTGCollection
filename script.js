// User Session Manager
class UserSessionManager {
    constructor() {
        this.session = this.loadSession();
        this.checkAuthState();
    }

    loadSession() {
        const sessionData = sessionStorage.getItem('mtg_session');
        if (!sessionData) return null;

        const session = JSON.parse(sessionData);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

        if (hoursSinceLogin >= 24) {
            this.clearSession();
            return null;
        }

        return session;
    }

    checkAuthState() {
        if (!this.session) {
            this.redirectToAuth();
            return;
        }

        // Display user info
        this.displayUserInfo();
    }

    displayUserInfo() {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-welcome">
                <span>Welcome, ${this.session.currentUser.username}</span>
                ${this.session.isGuest ? '<span class="guest-badge">Guest Mode</span>' : ''}
                <button id="logout-btn" class="logout-btn">Logout</button>
            </div>
        `;
        
        document.querySelector('header').appendChild(userInfo);
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    logout() {
        this.clearSession();
        this.redirectToAuth();
    }

    clearSession() {
        sessionStorage.removeItem('mtg_session');
        // Clear guest data if in guest mode
        if (this.session && this.session.isGuest) {
            localStorage.removeItem('mtgCollection');
            localStorage.removeItem('mtgDecks');
        }
    }

    redirectToAuth() {
        window.location.href = 'auth.html';
    }

    getCurrentUser() {
        return this.session ? this.session.currentUser : null;
    }

    isGuest() {
        return this.session ? this.session.isGuest : false;
    }

    getUserStorageKey(key) {
        if (this.isGuest()) {
            return key; // Guest mode uses regular localStorage keys
        }
        return `${key}_${this.session.currentUser.id}`;
    }
}

// MTG Collection Manager JavaScript

class MTGCollectionManager {
    constructor() {
        this.userManager = new UserSessionManager();
        this.collection = this.loadCollection();
        this.decks = this.loadDecks();
        this.currentPage = 'collection';
        this.pendingCard = null; // For modal functionality
        this.availableSets = []; // Cache for sets
        this.currentDeck = null; // Currently selected deck
        this.pendingDeckCard = null; // For deck modal functionality
    }

    async importDeck() {
        const input = document.getElementById('import-deck-url').value.trim();
        
        if (!input) {
            alert('Please enter a deck URL or paste a deck list');
            return;
        }

        try {
            let deckData;
            
            if (input.includes('archidekt.com')) {
                deckData = await this.importFromArchidekt(input);
            } else if (input.includes('moxfield.com')) {
                deckData = await this.importFromMoxfield(input);
            } else {
                // Assume it's a text deck list
                deckData = await this.importFromTextList(input);
            }
            
            if (deckData) {
                this.decks.push(deckData);
                this.saveDecks();
                this.displayDecks();
                document.getElementById('import-deck-url').value = '';
                alert(`Successfully imported "${deckData.name}"`);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing deck. Please check the URL or format.');
        }
    }

    async importFromTextList(textList) {
        const lines = textList.split('\n').filter(line => line.trim());
        const deckName = prompt('Enter deck name:') || 'Imported Deck';
        const deckFormat = prompt('Enter deck format (commander, standard, etc.):') || 'casual';
        
        const deck = {
            name: deckName,
            format: deckFormat,
            cards: [],
            dateCreated: new Date().toISOString(),
            totalValue: 0,
            mainboard: [],
            sideboard: [],
            commander: null
        };

        for (const line of lines) {
            const match = line.match(/^(\d+)\s+(.+)$/);
            if (match) {
                const quantity = parseInt(match[1]);
                const cardName = match[2].trim();
                
                try {
                    const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
                    const cardData = await response.json();
                    
                    const card = {
                        name: cardData.name,
                        setCode: cardData.set.toUpperCase(),
                        collectorNumber: cardData.collector_number,
                        quantity: quantity,
                        tcgPrice: cardData.prices?.usd ? parseFloat(cardData.prices.usd) : 0,
                        imageUrl: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal,
                        owned: this.collection.some(c => c.name === cardData.name)
                    };
                    
                    deck.cards.push(card);
                    deck.mainboard.push(card);
                    deck.totalValue += card.tcgPrice * quantity;
                } catch (error) {
                    console.error(`Error finding card: ${cardName}`, error);
                }
            }
        }
        
        return deck;
    }

    async importFromArchidekt(url) {
        // For demo purposes, we'll create a mock import
        // In a real implementation, you'd need to use the Archidekt API
        const deckName = prompt('Enter deck name:') || 'Archidekt Import';
        return {
            name: deckName,
            format: 'commander',
            cards: [],
            dateCreated: new Date().toISOString(),
            totalValue: 0,
            mainboard: [],
            sideboard: [],
            commander: null
        };
    }

    async importFromMoxfield(url) {
        // For demo purposes, we'll create a mock import
        // In a real implementation, you'd need to use the Moxfield API
        const deckName = prompt('Enter deck name:') || 'Moxfield Import';
        return {
            name: deckName,
            format: 'commander',
            cards: [],
            dateCreated: new Date().toISOString(),
            totalValue: 0,
            mainboard: [],
            sideboard: [],
            commander: null
        };
    }

    showAddToDeckModal(cardIdentifier, cardName, setCode, collectorNumber, imageUrl, tcgPrice) {
        this.pendingDeckCard = {
            name: cardName,
            setCode: setCode,
            collectorNumber: collectorNumber,
            imageUrl: imageUrl,
            tcgPrice: parseFloat(tcgPrice) || 0
        };
        
        document.getElementById('modal-deck-card-name').textContent = cardName;
        
        // Populate deck dropdown
        const deckSelect = document.getElementById('select-deck');
        deckSelect.innerHTML = '<option value="">Select a deck</option>';
        
        this.decks.forEach((deck, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${deck.name} (${deck.format})`;
            deckSelect.appendChild(option);
        });
        
        document.getElementById('add-to-deck-modal').style.display = 'block';
    }

    closeAddToDeckModal() {
        document.getElementById('add-to-deck-modal').style.display = 'none';
        this.pendingDeckCard = null;
    }

    confirmAddToDeck() {
        const deckIndex = parseInt(document.getElementById('select-deck').value);
        const quantity = parseInt(document.getElementById('card-quantity').value) || 1;
        
        if (isNaN(deckIndex) || !this.pendingDeckCard) {
            alert('Please select a deck');
            return;
        }
        
        const deck = this.decks[deckIndex];
        const existingCard = deck.cards.find(c => 
            c.name === this.pendingDeckCard.name && 
            c.setCode === this.pendingDeckCard.setCode
        );
        
        if (existingCard) {
            existingCard.quantity += quantity;
        } else {
            const newCard = {
                ...this.pendingDeckCard,
                quantity: quantity,
                owned: this.collection.some(c => 
                    c.name === this.pendingDeckCard.name && 
                    c.setCode === this.pendingDeckCard.setCode
                )
            };
            deck.cards.push(newCard);
            deck.mainboard.push(newCard);
        }
        
        deck.totalValue += this.pendingDeckCard.tcgPrice * quantity;
        
        this.saveDecks();
        this.displayDecks();
        this.closeAddToDeckModal();
        
        alert(`Added ${quantity}x ${this.pendingDeckCard.name} to ${deck.name}`);
    }

    displayDecks() {
        const decksContainer = document.getElementById('decks-container');
        decksContainer.innerHTML = '';
        
        this.decks.forEach((deck, index) => {
            const deckElement = document.createElement('div');
            deckElement.className = 'deck-card';
            deckElement.innerHTML = `
                <div class="deck-header">
                    <h3>${deck.name}</h3>
                    <span class="format-badge format-${deck.format}">${deck.format}</span>
                </div>
                <div class="deck-stats">
                    <span>${deck.cards.length} cards</span>
                    <span>$${deck.totalValue.toFixed(2)}</span>
                </div>
                <div class="deck-actions">
                    <button onclick="mtgCollection.viewDeck(${index})">View Deck</button>
                    <button onclick="mtgCollection.deleteDeck(${index})" class="delete-btn">Delete</button>
                </div>
            `;
            decksContainer.appendChild(deckElement);
        });
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableSets();
        this.displayCollection();
        this.displayStorage();
        this.displayDecks();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Tab navigation
        document.getElementById('collection-tab').addEventListener('click', () => this.switchPage('collection'));
        document.getElementById('storage-tab').addEventListener('click', () => this.switchPage('storage'));
        document.getElementById('decks-tab').addEventListener('click', () => this.switchPage('decks'));

        // Storage page
        document.getElementById('back-to-storage-btn').addEventListener('click', () => this.showStorageOverview());

        // Collection page
        document.getElementById('search-btn').addEventListener('click', () => this.searchCards());
        document.getElementById('clear-search-btn').addEventListener('click', () => this.clearSearch());
        document.getElementById('advanced-search-btn').addEventListener('click', () => this.toggleAdvancedSearch());
        document.getElementById('adv-search-btn').addEventListener('click', () => this.performAdvancedSearch());
        document.getElementById('adv-clear-btn').addEventListener('click', () => this.clearAdvancedSearch());
        document.getElementById('adv-close-btn').addEventListener('click', () => this.closeAdvancedSearch());
        document.getElementById('card-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCards();
        });
        document.getElementById('quick-add-btn').addEventListener('click', () => this.quickAddCard());
        document.getElementById('quick-add-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.quickAddCard();
        });

        // Modal functionality
        document.getElementById('storage-modal').addEventListener('click', (e) => {
            if (e.target.id === 'storage-modal') this.closeModal();
        });
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.querySelectorAll('.storage-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const location = e.target.dataset.location;
                this.addCardWithStorage(location);
            });
        });

        // Decks page
        document.getElementById('create-deck-btn').addEventListener('click', () => this.createDeck());
        document.getElementById('import-deck-btn').addEventListener('click', () => this.importDeck());
        document.getElementById('new-deck-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createDeck();
        });
        document.getElementById('back-to-decks-btn').addEventListener('click', () => this.showDeckList());
        document.getElementById('add-card-to-deck-btn').addEventListener('click', () => this.searchCardsForDeck());
        document.getElementById('edit-deck-btn').addEventListener('click', () => this.editCurrentDeck());
        document.getElementById('delete-deck-detail-btn').addEventListener('click', () => this.deleteCurrentDeck());

        // Add to Deck Modal
        document.getElementById('add-to-deck-modal').addEventListener('click', (e) => {
            if (e.target.id === 'add-to-deck-modal') this.closeAddToDeckModal();
        });
        document.querySelector('.close-deck-modal').addEventListener('click', () => this.closeAddToDeckModal());
        document.getElementById('confirm-add-to-deck-btn').addEventListener('click', () => this.confirmAddToDeck());
        document.getElementById('cancel-add-to-deck-btn').addEventListener('click', () => this.closeAddToDeckModal());
        
        // Sort functionality
        document.getElementById('sort-select').addEventListener('change', () => {
            this.displayCollection();
        });

        // Custom storage functionality
        document.getElementById('add-custom-storage-btn').addEventListener('click', () => {
            this.addCustomStorage();
        });

        document.getElementById('custom-storage-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCustomStorage();
            }
        });

        // Initialize storage options
        this.initializeStorageOptions();

        // Storage management functionality
        document.getElementById('toggle-storage-management').addEventListener('click', () => {
            this.toggleStorageManagement();
        });

        document.getElementById('add-storage-location-btn').addEventListener('click', () => {
            this.addStorageLocationFromPage();
        });

        document.getElementById('storage-page-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addStorageLocationFromPage();
            }
        });
        
        console.log('Event listeners set up successfully');
    }

    switchPage(page) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${page}-tab`).classList.add('active');

        // Update page content
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;
        
        // Load storage data when switching to storage page
        if (page === 'storage') {
            this.displayStorage();
        }
    }

    async searchCards() {
        const searchTerm = document.getElementById('card-search').value.trim();
        if (!searchTerm) return;

        const grid = document.getElementById('collection-grid');
        grid.innerHTML = '<div class="loading">Searching for all printings and versions...</div>';

        try {
            // Search in existing collection first
            const existingCards = this.collection.filter(card => 
                card.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            // Search for new cards from Scryfall
            const searchResults = await this.simulateCardSearch(searchTerm);
            
            // Update existing cards with search results data
            const allResults = searchResults.map(searchCard => {
                const existingCard = this.collection.find(c => 
                    c.name === searchCard.name && 
                    c.setCode === searchCard.setCode && 
                    c.collectorNumber === searchCard.collectorNumber
                );
                
                if (existingCard) {
                    return {
                        ...searchCard,
                        owned: existingCard.owned,
                        quantity: existingCard.quantity,
                        storage: existingCard.storage
                    };
                }
                return searchCard;
            });
            
            if (allResults.length === 0) {
                grid.innerHTML = '<div class="empty-state">No cards found matching your search.</div>';
                return;
            }

            grid.innerHTML = `<div class="search-results-info">Found ${allResults.length} printings/versions</div>`;
            await this.displaySearchResults(allResults);
        } catch (error) {
            console.error('Search error:', error);
            grid.innerHTML = '<div class="empty-state">Error searching for cards. Please try again.</div>';
        }
    }

    async simulateCardSearch(searchTerm) {
        // Use Scryfall API to search for real MTG cards
        try {
            let allCards = [];
            let hasMore = true;
            let nextUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchTerm)}&order=name&unique=prints`;
            
            console.log(`Searching for: ${searchTerm}`);
            
            // Fetch all pages of results
            while (hasMore && allCards.length < 300) { // Increased limit for more results
                console.log(`Fetching: ${nextUrl}`);
                const response = await fetch(nextUrl);
                const data = await response.json();
                
                if (data.data && data.data.length > 0) {
                    const cards = data.data.map(card => ({
                        name: card.name,
                        setName: card.set_name,
                        setCode: card.set.toUpperCase(),
                        collectorNumber: card.collector_number,
                        tcgPrice: card.prices?.usd ? parseFloat(card.prices.usd) : 0,
                        owned: this.collection.some(c => c.name === card.name && c.setCode === card.set.toUpperCase() && c.collectorNumber === card.collector_number),
                        quantity: this.collection.find(c => c.name === card.name && c.setCode === card.set.toUpperCase() && c.collectorNumber === card.collector_number)?.quantity || 0,
                        storage: this.collection.find(c => c.name === card.name && c.setCode === card.set.toUpperCase() && c.collectorNumber === card.collector_number)?.storage || null,
                        imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal,
                        scryfallId: card.id,
                        rarity: card.rarity,
                        artist: card.artist,
                        releasedAt: card.released_at
                    }));
                    
                    allCards = allCards.concat(cards);
                    console.log(`Found ${cards.length} cards, total: ${allCards.length}`);
                    
                    // Check if there are more pages
                    if (data.has_more && data.next_page) {
                        nextUrl = data.next_page;
                    } else {
                        hasMore = false;
                    }
                } else {
                    console.log('No more data found');
                    hasMore = false;
                }
                
                // Add a small delay to be respectful to the API
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            console.log(`Final result: ${allCards.length} cards`);
            return allCards;
        } catch (error) {
            console.error('Error fetching cards from Scryfall:', error);
            // Fallback to mock data
            return [
                { name: `${searchTerm} Card`, tcgPrice: 12.99, owned: false, quantity: 0, storage: null, imageUrl: null }
            ];
        }
    }

    async loadAvailableSets() {
        try {
            const response = await fetch('https://api.scryfall.com/sets');
            const data = await response.json();
            this.availableSets = data.data.sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
            this.populateSetDropdown();
        } catch (error) {
            console.error('Error loading sets:', error);
        }
    }

    populateSetDropdown() {
        const setSelect = document.getElementById('adv-set');
        setSelect.innerHTML = '<option value="">All Sets</option>';
        
        this.availableSets.forEach(set => {
            const option = document.createElement('option');
            option.value = set.code;
            option.textContent = `${set.name} (${set.code.toUpperCase()})`;
            setSelect.appendChild(option);
        });
    }

    toggleAdvancedSearch() {
        const panel = document.getElementById('advanced-search-panel');
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
    }

    closeAdvancedSearch() {
        document.getElementById('advanced-search-panel').style.display = 'none';
    }

    clearAdvancedSearch() {
        document.getElementById('adv-card-name').value = '';
        document.getElementById('adv-set').value = '';
        document.getElementById('adv-collector-number').value = '';
        document.getElementById('adv-rarity').value = '';
        document.getElementById('adv-owned').value = '';
        document.getElementById('adv-price-min').value = '';
        document.getElementById('adv-price-max').value = '';
    }

    async performAdvancedSearch() {
        const cardName = document.getElementById('adv-card-name').value.trim();
        const setCode = document.getElementById('adv-set').value;
        const collectorNumber = document.getElementById('adv-collector-number').value.trim();
        const rarity = document.getElementById('adv-rarity').value;
        const owned = document.getElementById('adv-owned').value;
        const priceMin = parseFloat(document.getElementById('adv-price-min').value) || 0;
        const priceMax = parseFloat(document.getElementById('adv-price-max').value) || Infinity;

        const grid = document.getElementById('collection-grid');
        grid.innerHTML = '<div class="loading">Performing advanced search...</div>';

        try {
            let searchQuery = [];
            
            if (cardName) searchQuery.push(`name:${cardName}`);
            if (setCode) searchQuery.push(`set:${setCode}`);
            if (collectorNumber) searchQuery.push(`cn:${collectorNumber}`);
            if (rarity) searchQuery.push(`rarity:${rarity}`);

            const queryString = searchQuery.join(' ');
            
            if (!queryString) {
                grid.innerHTML = '<div class="empty-state">Please enter at least one search criterion.</div>';
                return;
            }

            const searchResults = await this.advancedCardSearch(queryString);
            
            // Filter by ownership if specified
            let filteredResults = searchResults;
            if (owned === 'owned') {
                filteredResults = searchResults.filter(card => card.owned);
            } else if (owned === 'not-owned') {
                filteredResults = searchResults.filter(card => !card.owned);
            }

            // Filter by price range
            filteredResults = filteredResults.filter(card => {
                const price = card.tcgPrice || 0;
                return price >= priceMin && price <= priceMax;
            });

            if (filteredResults.length === 0) {
                grid.innerHTML = '<div class="empty-state">No cards found matching your criteria.</div>';
                return;
            }

            grid.innerHTML = `<div class="search-results-info">Found ${filteredResults.length} cards matching your criteria</div>`;
            await this.displaySearchResults(filteredResults);
            
        } catch (error) {
            console.error('Advanced search error:', error);
            grid.innerHTML = '<div class="empty-state">Error performing advanced search. Please try again.</div>';
        }
    }

    async advancedCardSearch(query) {
        try {
            let allCards = [];
            let hasMore = true;
            let nextUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name&unique=prints`;
            
            while (hasMore && allCards.length < 300) {
                const response = await fetch(nextUrl);
                const data = await response.json();
                
                if (data.data && data.data.length > 0) {
                    const cards = data.data.map(card => ({
                        name: card.name,
                        setName: card.set_name,
                        setCode: card.set.toUpperCase(),
                        collectorNumber: card.collector_number,
                        tcgPrice: card.prices?.usd ? parseFloat(card.prices.usd) : 0,
                        owned: this.collection.some(c => c.name === card.name && c.setCode === card.set.toUpperCase() && c.collectorNumber === card.collector_number),
                        quantity: this.collection.find(c => c.name === card.name && c.setCode === card.set.toUpperCase() && c.collectorNumber === card.collector_number)?.quantity || 0,
                        storage: this.collection.find(c => c.name === card.name && c.setCode === card.set.toUpperCase() && c.collectorNumber === card.collector_number)?.storage || null,
                        imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal,
                        scryfallId: card.id,
                        rarity: card.rarity,
                        artist: card.artist,
                        releasedAt: card.released_at
                    }));
                    
                    allCards = allCards.concat(cards);
                    
                    if (data.has_more && data.next_page) {
                        nextUrl = data.next_page;
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
                
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            return allCards;
        } catch (error) {
            console.error('Error in advanced search:', error);
            return [];
        }
    }

    clearSearch() {
        document.getElementById('card-search').value = '';
        this.displayCollection();
    }

    async quickAddCard() {
        const cardName = document.getElementById('quick-add-name').value.trim();
        if (!cardName) {
            alert('Please enter a card name');
            return;
        }

        // Try to find the card first
        try {
            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
            const data = await response.json();
            
            this.pendingCard = {
                name: data.name,
                setCode: data.set.toUpperCase(),
                collectorNumber: data.collector_number,
                imageUrl: data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal,
                tcgPrice: data.prices?.usd ? parseFloat(data.prices.usd) : 0
            };
            
            this.showStorageModal(data.name);
        } catch (error) {
            // If exact match fails, try fuzzy search
            try {
                const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
                const data = await response.json();
                
                this.pendingCard = {
                    name: data.name,
                    setCode: data.set.toUpperCase(),
                    collectorNumber: data.collector_number,
                    imageUrl: data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal,
                    tcgPrice: data.prices?.usd ? parseFloat(data.prices.usd) : 0
                };
                
                this.showStorageModal(data.name);
            } catch (error) {
                alert('Card not found. Please check the spelling and try again.');
            }
        }
    }

    showStorageModal(cardName) {
        document.getElementById('modal-card-name').textContent = cardName;
        document.getElementById('storage-modal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('storage-modal').style.display = 'none';
        this.pendingCard = null;
    }

    addCardWithStorage(storageLocation) {
        if (this.pendingCard) {
            // Store the price information properly
            this.addCardToCollectionSpecific(
                `${this.pendingCard.name}|||${this.pendingCard.setCode}|||${this.pendingCard.collectorNumber}`,
                this.pendingCard.name,
                this.pendingCard.setCode,
                this.pendingCard.collectorNumber,
                this.pendingCard.imageUrl,
                storageLocation
            );
            
            document.getElementById('quick-add-name').value = '';
            this.closeModal();
        }
    }

    async displaySearchResults(cards) {
        const grid = document.getElementById('collection-grid');
        
        // Don't clear the grid if there's already a results info message
        const existingInfo = grid.querySelector('.search-results-info');
        if (!existingInfo) {
            grid.innerHTML = '';
        }

        for (const card of cards) {
            const cardElement = await this.createCardElement(card);
            grid.appendChild(cardElement);
        }
    }

    async createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        
        const ownedStatus = card.owned ? 'owned-status' : 'not-owned-status';
        const ownedText = card.owned ? 'Yes' : 'No';
        const storageText = card.storage ? card.storage.replace('_', ' ').toUpperCase() : 'Not stored';
        const imageClass = card.owned ? 'owned' : 'not-owned';
        const ownershipClass = card.owned ? 'owned' : 'not-owned';
        const ownershipSymbol = card.owned ? '✓' : '✗';
        
        // If no image URL, try to fetch it from Scryfall
        let imageUrl = card.imageUrl;
        if (!imageUrl && card.name) {
            try {
                const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`);
                const data = await response.json();
                imageUrl = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
                card.imageUrl = imageUrl; // Cache it
            } catch (error) {
                console.error('Error fetching card image:', error);
            }
        }
        
        // Create unique identifier for this specific printing
        const cardIdentifier = `${card.name}|||${card.setCode || ''}|||${card.collectorNumber || ''}`;
        
        cardDiv.innerHTML = `
            <div class="card-name">${card.name}</div>
            ${card.setName ? `<div class="card-set">${card.setName} (${card.setCode}) #${card.collectorNumber}</div>` : ''}
            <div class="card-image-container">
                <img class="card-image ${imageClass}" 
                     src="${imageUrl || 'https://via.placeholder.com/200x279?text=No+Image'}" 
                     alt="${card.name}"
                     onerror="this.src='https://via.placeholder.com/200x279/333/fff?text=Card+Image+Not+Found'; this.classList.add('error');"
                     onload="this.classList.remove('loading');">
                <div class="ownership-indicator ${ownershipClass}">${ownershipSymbol}</div>
            </div>
            <div class="card-info">
                <div class="card-stat">
                    <span class="stat-label">TCG Price:</span>
                    <span class="stat-value price">$${card.tcgPrice?.toFixed(2) || 'N/A'}</span>
                </div>
                <div class="card-stat">
                    <span class="stat-label">Quantity:</span>
                    <span class="stat-value">${card.quantity || 0}</span>
                </div>
                ${card.rarity ? `<div class="card-stat">
                    <span class="stat-label">Rarity:</span>
                    <span class="stat-value">${card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}</span>
                </div>` : ''}
                <div class="card-stat">
                    <span class="stat-label">Storage:</span>
                    <span class="stat-value">${storageText}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="add-btn" onclick="manager.addCardFromSearch('${cardIdentifier}', '${card.name}', '${card.setCode || ''}', '${card.collectorNumber || ''}', '${card.imageUrl || ''}', ${card.tcgPrice || 0})">Add Copy</button>
                <button class="add-to-deck-btn" onclick="manager.showAddToDeckModal('${cardIdentifier}', '${card.name}', '${card.setCode || ''}', '${card.collectorNumber || ''}', '${card.imageUrl || ''}', ${card.tcgPrice || 0})">Add to Deck</button>
                <button class="remove-btn" onclick="manager.removeCardFromCollectionSpecific('${cardIdentifier}', '${card.name}', '${card.setCode || ''}', '${card.collectorNumber || ''}')">Remove Copy</button>
            </div>
        `;
        
        return cardDiv;
    }

    addCardFromSearch(cardIdentifier, cardName, setCode, collectorNumber, imageUrl, tcgPrice) {
        // Set up pending card with proper price info
        this.pendingCard = {
            name: cardName,
            setCode: setCode,
            collectorNumber: collectorNumber,
            imageUrl: imageUrl,
            tcgPrice: parseFloat(tcgPrice) || 0 // Ensure it's a number
        };
        
        console.log(`Setting up pending card: ${cardName} with price $${this.pendingCard.tcgPrice}`);
        this.showStorageModal(cardName);
    }

    async addCard() {
        const cardName = document.getElementById('add-card-name').value.trim();
        const storageLocation = document.getElementById('storage-location').value;
        
        if (!cardName) {
            alert('Please enter a card name');
            return;
        }
        
        if (!storageLocation) {
            alert('Please select a storage location');
            return;
        }

        // Try to fetch card image if not already cached
        let imageUrl = null;
        try {
            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
            const data = await response.json();
            imageUrl = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
        } catch (error) {
            console.error('Error fetching card image:', error);
        }

        this.addCardToCollection(cardName, storageLocation, imageUrl);
        
        // Clear inputs
        document.getElementById('add-card-name').value = '';
        document.getElementById('storage-location').value = '';
    }

    addCardToCollectionSpecific(cardIdentifier, cardName, setCode, collectorNumber, imageUrl, storageLocation = 'box_1') {
        // Create unique identifier for this specific printing
        const uniqueId = `${cardName}|||${setCode}|||${collectorNumber}`;
        let card = this.collection.find(c => `${c.name}|||${c.setCode || ''}|||${c.collectorNumber || ''}` === uniqueId);
        
        if (card) {
            card.quantity++;
            card.owned = true;
            if (storageLocation) card.storage = storageLocation;
            console.log(`Updated existing card: ${cardName} with price $${card.tcgPrice.toFixed(2)}`);
        } else {
            // Get the real price from the pending card
            let tcgPrice = 0;
            if (this.pendingCard && this.pendingCard.name === cardName && this.pendingCard.setCode === setCode && this.pendingCard.collectorNumber === collectorNumber) {
                tcgPrice = this.pendingCard.tcgPrice;
                console.log(`Using pending card price: $${tcgPrice}`);
            } else {
                // Fallback: try to find the price from search results or use random for demo
                tcgPrice = Math.random() * 50 + 1;
                console.log(`Using fallback price: $${tcgPrice}`);
            }
            
            card = {
                name: cardName,
                setCode: setCode,
                collectorNumber: collectorNumber,
                tcgPrice: tcgPrice,
                owned: true,
                quantity: 1,
                storage: storageLocation,
                imageUrl: imageUrl,
                dateAdded: new Date().toISOString()
            };
            this.collection.push(card);
            console.log(`Added new card: ${cardName} with price $${tcgPrice.toFixed(2)}`);
        }
        
        this.saveCollection();
        this.refreshCurrentView();
        console.log(`Final card data: ${JSON.stringify(card)}`);
    }

    removeCardFromCollectionSpecific(cardIdentifier, cardName, setCode, collectorNumber) {
        const uniqueId = `${cardName}|||${setCode}|||${collectorNumber}`;
        const card = this.collection.find(c => `${c.name}|||${c.setCode || ''}|||${c.collectorNumber || ''}` === uniqueId);
        
        if (card && card.quantity > 0) {
            card.quantity--;
            if (card.quantity === 0) {
                card.owned = false;
                card.storage = null;
            }
            this.saveCollection();
            this.refreshCurrentView();
            console.log(`Removed ${cardName} (${setCode} #${collectorNumber}) from collection`);
        }
    }

    refreshCurrentView() {
        if (this.currentPage === 'collection') {
            // Check if we're showing search results or full collection
            const searchTerm = document.getElementById('card-search').value.trim();
            if (searchTerm) {
                this.searchCards();
            } else {
                this.displayCollection();
            }
        } else if (this.currentPage === 'storage') {
            this.displayStorage();
        }
    }

    addCardToCollection(cardName, storageLocation = null, imageUrl = null) {
        // Legacy method - adds the first available printing of a card
        let card = this.collection.find(c => c.name === cardName && !c.setCode);
        
        if (card) {
            card.quantity++;
            card.owned = true;
            if (storageLocation) card.storage = storageLocation;
            if (imageUrl) card.imageUrl = imageUrl;
        } else {
            card = {
                name: cardName,
                tcgPrice: Math.random() * 50 + 1, // Random price for demo
                owned: true,
                quantity: 1,
                storage: storageLocation || 'box_1',
                imageUrl: imageUrl
            };
            this.collection.push(card);
        }
        
        this.saveCollection();
        this.refreshCurrentView();
        console.log(`Added ${cardName} to collection`);
    }

    removeCardFromCollection(cardName) {
        // Legacy method - removes from first available printing of a card
        const card = this.collection.find(c => c.name === cardName && !c.setCode);
        
        if (card && card.quantity > 0) {
            card.quantity--;
            if (card.quantity === 0) {
                card.owned = false;
                card.storage = null;
            }
            this.saveCollection();
            this.refreshCurrentView();
            console.log(`Removed ${cardName} from collection`);
        }
    }    async displayCollection() {
        const grid = document.getElementById('collection-grid');
        
        if (this.collection.length === 0) {
            grid.innerHTML = '<div class="empty-state">No cards in collection. Use search to find and add cards!</div>';
            return;
        }

        // Get current sort option
        const sortSelect = document.getElementById('sort-select');
        const sortOption = sortSelect ? sortSelect.value : 'name';

        // Filter and sort collection
        const ownedCards = this.collection.filter(card => card.owned);
        const sortedCards = this.sortCards(ownedCards, sortOption);

        grid.innerHTML = '';
        for (const card of sortedCards) {
            const cardElement = await this.createCardElement(card);
            grid.appendChild(cardElement);
        }
    }

    sortCards(cards, sortOption) {
        return [...cards].sort((a, b) => {
            switch (sortOption) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'price':
                    return (a.tcgPrice || 0) - (b.tcgPrice || 0);
                case 'price-desc':
                    return (b.tcgPrice || 0) - (a.tcgPrice || 0);
                case 'set':
                    return (a.setCode || '').localeCompare(b.setCode || '');
                case 'rarity':
                    const rarityOrder = { 'common': 0, 'uncommon': 1, 'rare': 2, 'mythic': 3 };
                    return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
                case 'date-added':
                    return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
                default:
                    return 0;
            }
        });
    }

    createDeck() {
        const deckName = document.getElementById('new-deck-name').value.trim();
        const deckFormat = document.getElementById('new-deck-format').value;
        
        if (!deckName) {
            alert('Please enter a deck name');
            return;
        }
        
        if (!deckFormat) {
            alert('Please select a format');
            return;
        }
        
        if (this.decks.some(deck => deck.name === deckName)) {
            alert('A deck with this name already exists');
            return;
        }

        const newDeck = {
            name: deckName,
            format: deckFormat,
            cards: [],
            dateCreated: new Date().toISOString(),
            totalValue: 0,
            mainboard: [],
            sideboard: [],
            commander: null
        };
        
        this.decks.push(newDeck);
        this.saveDecks();
        this.displayDecks();
        
        document.getElementById('new-deck-name').value = '';
        document.getElementById('new-deck-format').value = '';
    }

    viewDeck(index) {
        this.currentDeck = this.decks[index];
        
        // Update deck detail header
        document.getElementById('deck-detail-name').textContent = this.currentDeck.name;
        document.getElementById('deck-detail-format').textContent = this.currentDeck.format;
        document.getElementById('deck-detail-format').className = `deck-format-badge format-${this.currentDeck.format}`;
        
        // Update deck stats
        const totalCards = this.currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
        const uniqueCards = this.currentDeck.cards.length;
        const ownedCards = this.currentDeck.cards.filter(card => card.owned).length;
        
        document.getElementById('deck-total-cards').textContent = totalCards;
        document.getElementById('deck-unique-cards').textContent = uniqueCards;
        document.getElementById('deck-total-value').textContent = `$${this.currentDeck.totalValue.toFixed(2)}`;
        document.getElementById('deck-owned-cards').textContent = ownedCards;
        
        // Display deck cards
        const cardsContainer = document.getElementById('deck-detail-content');
        cardsContainer.innerHTML = '';
        
        this.currentDeck.cards.forEach((card, cardIndex) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'deck-card-item';
            cardElement.innerHTML = `
                <div class="card-info">
                    <img src="${card.imageUrl}" alt="${card.name}" class="card-image-small">
                    <div class="card-details">
                        <h4>${card.name}</h4>
                        <p>${card.setCode} • ${card.collectorNumber}</p>
                        <p>Quantity: ${card.quantity}</p>
                        <p>$${(card.tcgPrice * card.quantity).toFixed(2)}</p>
                        ${card.owned ? '<span class="owned-badge">Owned</span>' : '<span class="missing-badge">Missing</span>'}
                    </div>
                </div>
                <button onclick="mtgCollection.removeFromDeck(${cardIndex})" class="remove-btn">Remove</button>
            `;
            cardsContainer.appendChild(cardElement);
        });
        
        // Show deck detail view and hide deck list
        document.getElementById('deck-list-view').style.display = 'none';
        document.getElementById('deck-detail-view').style.display = 'block';
    }

    showDeckList() {
        // Show deck list and hide deck detail view
        document.getElementById('deck-detail-view').style.display = 'none';
        document.getElementById('deck-list-view').style.display = 'block';
        this.currentDeck = null;
    }

    removeFromDeck(cardIndex) {
        if (this.currentDeck && confirm('Remove this card from the deck?')) {
            const card = this.currentDeck.cards[cardIndex];
            this.currentDeck.totalValue -= card.tcgPrice * card.quantity;
            this.currentDeck.cards.splice(cardIndex, 1);
            
            // Remove from mainboard too
            const mainboardIndex = this.currentDeck.mainboard.findIndex(c => c === card);
            if (mainboardIndex > -1) {
                this.currentDeck.mainboard.splice(mainboardIndex, 1);
            }
            
            this.saveDecks();
            this.displayDecks();
            this.viewDeck(this.decks.indexOf(this.currentDeck));
        }
    }

    deleteDeck(index) {
        if (confirm('Are you sure you want to delete this deck?')) {
            this.decks.splice(index, 1);
            this.saveDecks();
            this.displayDecks();
        }
    }

    deleteCurrentDeck() {
        if (this.currentDeck && confirm('Are you sure you want to delete this deck?')) {
            const deckIndex = this.decks.indexOf(this.currentDeck);
            this.decks.splice(deckIndex, 1);
            this.saveDecks();
            this.displayDecks();
            this.showDeckList();
        }
    }

    loadCollection() {
        const storageKey = this.userManager.getUserStorageKey('mtgCollection');
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    }

    loadDecks() {
        const storageKey = this.userManager.getUserStorageKey('mtgDecks');
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    }

    saveCollection() {
        const storageKey = this.userManager.getUserStorageKey('mtgCollection');
        localStorage.setItem(storageKey, JSON.stringify(this.collection));
    }

    saveDecks() {
        const storageKey = this.userManager.getUserStorageKey('mtgDecks');
        localStorage.setItem(storageKey, JSON.stringify(this.decks));
    }

    displayStorage() {
        this.showStorageOverview();
    }

    showStorageOverview() {
        const storageContainer = document.getElementById('storage-locations');
        const storageDetail = document.getElementById('storage-detail');
        const backButton = document.getElementById('back-to-storage-btn');
        
        // Show storage overview, hide detail
        storageContainer.style.display = 'grid';
        storageDetail.querySelector('.storage-detail-header h3').textContent = 'Select a storage location';
        storageDetail.querySelector('#storage-detail-content').innerHTML = '';
        backButton.style.display = 'none';
        
        // Clear and populate storage locations
        storageContainer.innerHTML = '';
        
        const locations = this.getStorageLocations();
        locations.forEach(location => {
            const cardsInLocation = this.collection.filter(card => card.storage === location.id && card.owned);
            const locationElement = document.createElement('div');
            locationElement.className = 'storage-location-card';
            locationElement.onclick = () => this.showStorageDetail(location.id);
            
            const cardCount = cardsInLocation.length;
            const totalValue = cardsInLocation.reduce((sum, card) => sum + (card.tcgPrice * card.quantity), 0);
            
            locationElement.innerHTML = `
                <div class="storage-location-header">
                    <h3>${location.name}</h3>
                    <span class="card-count">${cardCount} cards</span>
                </div>
                <div class="storage-location-stats">
                    <span class="total-value">$${totalValue.toFixed(2)}</span>
                </div>
            `;
            
            storageContainer.appendChild(locationElement);
        });
    }

    showStorageDetail(locationId) {
        const storageContainer = document.getElementById('storage-locations');
        const storageDetail = document.getElementById('storage-detail');
        const backButton = document.getElementById('back-to-storage-btn');
        const titleElement = storageDetail.querySelector('.storage-detail-header h3');
        const contentElement = storageDetail.querySelector('#storage-detail-content');
        
        // Hide storage overview, show detail
        storageContainer.style.display = 'none';
        backButton.style.display = 'block';
        
        const locations = this.getStorageLocations();
        const location = locations.find(loc => loc.id === locationId);
        const displayName = location ? location.name : locationId.replace('_', ' ').toUpperCase();
        titleElement.textContent = displayName;
        
        // Get cards in this location
        const cardsInLocation = this.collection.filter(card => card.storage === locationId && card.owned);
        
        // Clear and populate cards
        contentElement.innerHTML = '';
        
        if (cardsInLocation.length === 0) {
            contentElement.innerHTML = '<div class="empty-state">No cards in this storage location</div>';
            return;
        }
        
        cardsInLocation.forEach(async (card) => {
            const cardElement = await this.createCardElement(card);
            contentElement.appendChild(cardElement);
        });
    }

    // Custom Storage Management
    getStorageLocations() {
        const storageKey = this.userManager.getUserStorageKey('storage_locations');
        const defaultLocations = [
            { id: 'box_1', name: 'Box 1', isCustom: false },
            { id: 'box_2', name: 'Box 2', isCustom: false },
            { id: 'trading_binder', name: 'Trading Binder', isCustom: false }
        ];
        
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return [...defaultLocations, ...parsed.filter(loc => loc.isCustom)];
            } catch (e) {
                console.error('Error parsing storage locations:', e);
                return defaultLocations;
            }
        }
        return defaultLocations;
    }

    saveStorageLocations(locations) {
        const storageKey = this.userManager.getUserStorageKey('storage_locations');
        const customLocations = locations.filter(loc => loc.isCustom);
        localStorage.setItem(storageKey, JSON.stringify(customLocations));
    }

    addCustomStorage() {
        const nameInput = document.getElementById('custom-storage-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            alert('Please enter a storage location name');
            return;
        }
        
        const locations = this.getStorageLocations();
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        // Check if already exists
        if (locations.some(loc => loc.id === id)) {
            alert('A storage location with this name already exists');
            return;
        }
        
        const newLocation = {
            id: id,
            name: name,
            isCustom: true,
            dateCreated: new Date().toISOString()
        };
        
        locations.push(newLocation);
        this.saveStorageLocations(locations);
        this.initializeStorageOptions();
        nameInput.value = '';
        
        // Add to collection if there's a pending card
        if (this.pendingCard) {
            this.addCardWithStorage(id);
        }
    }

    deleteCustomStorage(locationId) {
        const locations = this.getStorageLocations();
        const location = locations.find(loc => loc.id === locationId);
        
        if (!location || !location.isCustom) {
            alert('Cannot delete default storage locations');
            return;
        }
        
        if (confirm(`Are you sure you want to delete "${location.name}"? This will not remove cards from your collection.`)) {
            const filteredLocations = locations.filter(loc => loc.id !== locationId);
            this.saveStorageLocations(filteredLocations);
            this.initializeStorageOptions();
            this.displayStorageLocations();
        }
    }

    initializeStorageOptions() {
        const container = document.getElementById('storage-options-container');
        if (!container) return;
        
        const locations = this.getStorageLocations();
        container.innerHTML = '';
        
        locations.forEach(location => {
            const button = document.createElement('button');
            button.className = 'storage-option';
            button.dataset.location = location.id;
            button.textContent = location.name;
            
            if (location.isCustom) {
                button.classList.add('custom-location');
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-storage';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete this storage location';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.deleteCustomStorage(location.id);
                };
                button.appendChild(deleteBtn);
            }
            
            button.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-storage')) return;
                this.addCardWithStorage(location.id);
            });
            
            container.appendChild(button);
        });
    }

    toggleStorageManagement() {
        const panel = document.getElementById('storage-management-panel');
        const button = document.getElementById('toggle-storage-management');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            button.textContent = '- Hide Management';
            button.classList.add('active');
        } else {
            panel.style.display = 'none';
            button.textContent = '+ Add New Location';
            button.classList.remove('active');
        }
    }

    addStorageLocationFromPage() {
        const input = document.getElementById('storage-page-input');
        const name = input.value.trim();
        
        if (!name) {
            alert('Please enter a storage location name');
            return;
        }
        
        const locations = this.getStorageLocations();
        const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        // Check if already exists
        if (locations.some(loc => loc.id === id)) {
            alert('A storage location with this name already exists');
            return;
        }
        
        const newLocation = {
            id: id,
            name: name,
            isCustom: true,
            dateCreated: new Date().toISOString()
        };
        
        locations.push(newLocation);
        this.saveStorageLocations(locations);
        this.displayStorage(); // Refresh the storage display
        this.initializeStorageOptions(); // Update modal options
        
        input.value = '';
        
        // Show success message
        this.showSuccessMessage(`Storage location "${name}" created successfully!`);
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 1rem;
            border-radius: 6px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing manager...');
    
    try {
        window.manager = new MTGCollectionManager();
        window.mtgCollection = window.manager; // Create alias for button onclick handlers
        
        console.log('Manager created, calling init...');
        // Initialize the manager (this sets up event listeners)
        window.manager.init();
        console.log('Manager initialized successfully');
    } catch (error) {
        console.error('Error initializing manager:', error);
    }
});

// Add some sample data for demonstration
document.addEventListener('DOMContentLoaded', () => {
    // Add sample cards if collection is empty
    setTimeout(async () => {
        if (manager.collection.length === 0) {
            const sampleCards = [
                { name: 'Lightning Bolt', tcgPrice: 2.50, owned: true, quantity: 4, storage: 'red_binder', imageUrl: null },
                { name: 'Black Lotus', tcgPrice: 45000.00, owned: false, quantity: 0, storage: null, imageUrl: null },
                { name: 'Counterspell', tcgPrice: 1.25, owned: true, quantity: 3, storage: 'blue_binder', imageUrl: null },
                { name: 'Giant Growth', tcgPrice: 0.75, owned: true, quantity: 2, storage: 'big_white_container', imageUrl: null },
                { name: 'Sol Ring', tcgPrice: 8.99, owned: true, quantity: 1, storage: 'jbm_deck', imageUrl: null }
            ];
            
            // Fetch images for sample cards
            for (const card of sampleCards) {
                try {
                    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`);
                    const data = await response.json();
                    card.imageUrl = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
                } catch (error) {
                    console.error(`Error fetching image for ${card.name}:`, error);
                }
            }
            
            sampleCards.forEach(card => manager.collection.push(card));
            manager.saveCollection();
            manager.displayCollection();
        }
    }, 100);
});
