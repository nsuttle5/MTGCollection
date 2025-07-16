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
        // Remove existing user info to prevent duplicates
        const existingUserInfo = document.querySelector('.user-info');
        if (existingUserInfo) {
            existingUserInfo.remove();
        }
        
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
        // Clear user-specific data if in guest mode
        if (this.session && this.session.isGuest) {
            localStorage.removeItem(this.getUserStorageKey('mtgCollection'));
            localStorage.removeItem(this.getUserStorageKey('mtgDecks'));
            localStorage.removeItem(this.getUserStorageKey('storage_locations'));
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
            console.log(`Guest mode: Using storage key "${key}"`);
            return key; // Guest mode uses regular localStorage keys
        }
        const userKey = `${key}_${this.session.currentUser.id}`;
        console.log(`User mode: Using storage key "${userKey}" for user ${this.session.currentUser.username}`);
        return userKey;
    }

    debugStorage() {
        console.log('=== Storage Debug Info ===');
        console.log('Current session:', this.session);
        console.log('Is guest:', this.isGuest());
        console.log('Current user:', this.getCurrentUser());
        console.log('LocalStorage keys:', Object.keys(localStorage));
        console.log('SessionStorage keys:', Object.keys(sessionStorage));
        console.log('Collection key:', this.getUserStorageKey('mtgCollection'));
        console.log('Decks key:', this.getUserStorageKey('mtgDecks'));
        console.log('Storage locations key:', this.getUserStorageKey('storage_locations'));
        console.log('=== End Debug Info ===');
    }
}

// MTG Collection Manager JavaScript

class MTGCollectionManager {
    constructor() {
        this.userManager = new UserSessionManager();
        this.userManager.debugStorage(); // Debug storage on initialization
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
        this.displayUsers();
    }

    displayUsers() {
        const currentUser = this.userManager.getCurrentUser();
        const isGuest = this.userManager.isGuest();
        
        // Update current user info
        document.getElementById('current-user-name').textContent = currentUser ? currentUser.username : 'Unknown User';
        document.getElementById('current-user-status').textContent = isGuest ? 'Guest Mode' : 'Registered User';
        document.getElementById('current-user-avatar').textContent = currentUser ? currentUser.username.charAt(0).toUpperCase() : 'U';
        
        // Update user statistics
        const totalCards = this.collection.filter(card => card.owned).reduce((sum, card) => sum + card.quantity, 0);
        const collectionValue = this.collection.filter(card => card.owned).reduce((sum, card) => sum + (card.tcgPrice * card.quantity), 0);
        const deckCount = this.decks.length;
        
        document.getElementById('user-total-cards').textContent = totalCards.toString();
        document.getElementById('user-collection-value').textContent = `$${collectionValue.toFixed(2)}`;
        
        // Display friends and trade offers
        this.displayFriends();
        this.updateTradeOffersDisplay();
        
        // Setup user action buttons
        this.setupUserActions();
    }

    displayRegisteredUsers() {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        // Load users from localStorage (same as auth.js)
        const users = JSON.parse(localStorage.getItem('mtg_users') || '[]');
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar-small">
                        <span>${user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="user-details-small">
                        <h4>${user.username}</h4>
                        <p>Created: ${new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="user-actions-small">
                    <button onclick="mtgCollection.switchToUser('${user.id}')" class="switch-user-btn">Switch</button>
                </div>
            `;
            usersList.appendChild(userElement);
        });
    }

    setupUserActions() {
        // Remove existing event listeners to avoid duplicates
        const exportBtn = document.getElementById('export-collection-btn');
        const importBtn = document.getElementById('import-collection-btn');
        const clearBtn = document.getElementById('clear-collection-btn');
        const switchBtn = document.getElementById('switch-user-btn');
        
        if (exportBtn) {
            exportBtn.replaceWith(exportBtn.cloneNode(true));
            document.getElementById('export-collection-btn').addEventListener('click', () => this.exportCollection());
        }
        
        if (importBtn) {
            importBtn.replaceWith(importBtn.cloneNode(true));
            document.getElementById('import-collection-btn').addEventListener('click', () => this.importCollection());
        }
        
        if (clearBtn) {
            clearBtn.replaceWith(clearBtn.cloneNode(true));
            document.getElementById('clear-collection-btn').addEventListener('click', () => this.clearCollection());
        }
        
        if (switchBtn) {
            switchBtn.replaceWith(switchBtn.cloneNode(true));
            document.getElementById('switch-user-btn').addEventListener('click', () => this.switchUser());
        }
    }

    exportCollection() {
        const exportData = {
            collection: this.collection,
            decks: this.decks,
            storageLocations: this.getStorageLocations().filter(loc => loc.isCustom),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `mtg-collection-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    importCollection() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importData = JSON.parse(e.target.result);
                        
                        if (confirm('This will replace your current collection. Are you sure?')) {
                            this.collection = importData.collection || [];
                            this.decks = importData.decks || [];
                            
                            // Import custom storage locations
                            if (importData.storageLocations) {
                                this.saveStorageLocations(importData.storageLocations);
                            }
                            
                            this.saveCollection();
                            this.saveDecks();
                            this.displayCollection();
                            this.displayStorage();
                            this.displayDecks();
                            this.displayUsers();
                            
                            alert('Collection imported successfully!');
                        }
                    } catch (error) {
                        alert('Error importing collection: Invalid file format');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    clearCollection() {
        if (confirm('Are you sure you want to clear your entire collection? This cannot be undone.')) {
            this.collection = [];
            this.decks = [];
            this.saveCollection();
            this.saveDecks();
            this.displayCollection();
            this.displayStorage();
            this.displayDecks();
            this.displayUsers();
            alert('Collection cleared successfully!');
        }
    }

    switchUser() {
        if (confirm('Switch to a different user account?')) {
            window.location.href = 'auth.html';
        }
    }

    switchToUser(userId) {
        if (confirm('Switch to this user account?')) {
            // Create a new session for the selected user
            const users = JSON.parse(localStorage.getItem('mtg_users') || '[]');
            const user = users.find(u => u.id === userId);
            
            if (user) {
                const sessionData = {
                    currentUser: user,
                    isGuest: false,
                    loginTime: new Date().toISOString()
                };
                sessionStorage.setItem('mtg_session', JSON.stringify(sessionData));
                window.location.reload();
            }
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Tab navigation
        const collectionTab = document.getElementById('collection-tab');
        const storageTab = document.getElementById('storage-tab');
        const decksTab = document.getElementById('decks-tab');
        const usersTab = document.getElementById('users-tab');
        const profileTab = document.getElementById('profile-tab');
        
        console.log('Tab elements found:', { collectionTab, storageTab, decksTab, usersTab, profileTab });
        
        if (collectionTab) {
            collectionTab.addEventListener('click', () => {
                console.log('Collection tab clicked');
                this.switchPage('collection');
            });
        }
        
        if (storageTab) {
            storageTab.addEventListener('click', () => {
                console.log('Storage tab clicked');
                this.switchPage('storage');
            });
        }
        
        if (decksTab) {
            decksTab.addEventListener('click', () => {
                console.log('Decks tab clicked');
                this.switchPage('decks');
            });
        }
        
        if (usersTab) {
            usersTab.addEventListener('click', () => {
                console.log('Users tab clicked');
                this.switchPage('users');
            });
        }
        
        if (profileTab) {
            profileTab.addEventListener('click', () => {
                console.log('Profile tab clicked');
                this.switchPage('profile');
            });
        }

        // Storage page
        const backToStorageBtn = document.getElementById('back-to-storage-btn');
        if (backToStorageBtn) {
            backToStorageBtn.addEventListener('click', () => this.showStorageOverview());
        }

        // Collection page
        const searchBtn = document.getElementById('search-btn');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const advancedSearchBtn = document.getElementById('advanced-search-btn');
        
        console.log('Search buttons found:', { searchBtn, clearSearchBtn, advancedSearchBtn });
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                console.log('Search button clicked');
                this.searchCards();
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                console.log('Clear search button clicked');
                this.clearSearch();
            });
        }
        
        if (advancedSearchBtn) {
            advancedSearchBtn.addEventListener('click', () => {
                console.log('Advanced search button clicked');
                this.toggleAdvancedSearch();
            });
        }
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

        // Users page event listeners will be set up in setupUserActions()
        
        // Friend system and trading event listeners
        document.getElementById('search-friend-btn').addEventListener('click', () => {
            const username = document.getElementById('friend-search-input').value.trim();
            if (username) {
                this.searchFriend(username);
            }
        });
        
        document.getElementById('friend-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const username = document.getElementById('friend-search-input').value.trim();
                if (username) {
                    this.searchFriend(username);
                }
            }
        });
        
        // Trade tabs
        document.getElementById('incoming-trades-tab').addEventListener('click', () => {
            document.querySelectorAll('.trade-tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById('incoming-trades-tab').classList.add('active');
            this.updateTradeOffersDisplay();
        });
        
        document.getElementById('outgoing-trades-tab').addEventListener('click', () => {
            document.querySelectorAll('.trade-tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById('outgoing-trades-tab').classList.add('active');
            this.updateTradeOffersDisplay();
        });
        
        // Modal event listeners
        document.getElementById('friend-collection-modal').addEventListener('click', (e) => {
            if (e.target.id === 'friend-collection-modal') {
                e.target.style.display = 'none';
            }
        });
        
        document.getElementById('friend-collection-close').addEventListener('click', () => {
            document.getElementById('friend-collection-modal').style.display = 'none';
        });
        
        document.getElementById('trade-offer-modal').addEventListener('click', (e) => {
            if (e.target.id === 'trade-offer-modal') {
                e.target.style.display = 'none';
            }
        });
        
        document.getElementById('trade-offer-close').addEventListener('click', () => {
            document.getElementById('trade-offer-modal').style.display = 'none';
        });
        
        document.getElementById('your-collection-modal').addEventListener('click', (e) => {
            if (e.target.id === 'your-collection-modal') {
                e.target.style.display = 'none';
            }
        });
        
        document.getElementById('your-collection-close').addEventListener('click', () => {
            document.getElementById('your-collection-modal').style.display = 'none';
        });
        
        // Trade offer actions
        document.getElementById('add-your-cards-btn').addEventListener('click', () => {
            this.showYourCollectionForTrade();
        });
        
        document.getElementById('send-trade-offer-btn').addEventListener('click', () => {
            this.sendTradeOffer();
        });
        
        document.getElementById('cancel-trade-btn').addEventListener('click', () => {
            document.getElementById('trade-offer-modal').style.display = 'none';
            this.currentTradeOffer = null;
        });
        
        // Friend collection search
        document.getElementById('friend-collection-search-btn').addEventListener('click', () => {
            const searchTerm = document.getElementById('friend-collection-search').value.trim();
            this.searchFriendCollection(searchTerm);
        });
        
        document.getElementById('friend-collection-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = document.getElementById('friend-collection-search').value.trim();
                this.searchFriendCollection(searchTerm);
            }
        });
        
        // Your collection search for trading
        document.getElementById('your-collection-search-btn').addEventListener('click', () => {
            const searchTerm = document.getElementById('your-collection-search').value.trim();
            this.searchYourCollectionForTrade(searchTerm);
        });
        
        document.getElementById('your-collection-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = document.getElementById('your-collection-search').value.trim();
                this.searchYourCollectionForTrade(searchTerm);
            }
        });
        
        // Modal close event listeners
        document.getElementById('friend-collection-close').addEventListener('click', () => {
            this.closeModal('friend-collection-modal');
        });
        
        document.getElementById('trade-offer-close').addEventListener('click', () => {
            this.closeModal('trade-offer-modal');
        });
        
        document.getElementById('your-collection-close').addEventListener('click', () => {
            this.closeModal('your-collection-modal');
        });
        
        // Trade offer modal buttons
        document.getElementById('add-your-cards-btn').addEventListener('click', () => {
            this.showYourCollectionForTrade();
        });
        
        document.getElementById('send-trade-offer-btn').addEventListener('click', () => {
            this.sendTradeOffer();
        });
        
        document.getElementById('cancel-trade-btn').addEventListener('click', () => {
            this.closeModal('trade-offer-modal');
        });
        
        // Trade tab switching
        document.getElementById('incoming-trades-tab').addEventListener('click', () => {
            this.switchTradeTab('incoming');
        });
        
        document.getElementById('outgoing-trades-tab').addEventListener('click', () => {
            this.switchTradeTab('outgoing');
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        // Trade details modal event listeners
        document.getElementById('trade-details-close').addEventListener('click', () => {
            this.closeModal('trade-details-modal');
        });
        
        document.getElementById('close-trade-details-btn').addEventListener('click', () => {
            this.closeModal('trade-details-modal');
        });
        
        document.getElementById('trade-details-modal').addEventListener('click', (e) => {
            if (e.target.id === 'trade-details-modal') {
                this.closeModal('trade-details-modal');
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
        
        // Load page-specific data
        if (page === 'storage') {
            this.displayStorage();
        } else if (page === 'users') {
            this.displayUsers();
        } else if (page === 'profile') {
            this.displayProfile();
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
        document.getElementById('adv-foil').value = '';
        document.getElementById('adv-price-min').value = '';
        document.getElementById('adv-price-max').value = '';
    }

    async performAdvancedSearch() {
        const cardName = document.getElementById('adv-card-name').value.trim();
        const setCode = document.getElementById('adv-set').value;
        const collectorNumber = document.getElementById('adv-collector-number').value.trim();
        const rarity = document.getElementById('adv-rarity').value;
        const owned = document.getElementById('adv-owned').value;
        const foil = document.getElementById('adv-foil').value;
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

            // Filter by foil if specified
            if (foil === 'foil') {
                filteredResults = filteredResults.filter(card => card.foil === true);
            } else if (foil === 'non-foil') {
                filteredResults = filteredResults.filter(card => card.foil !== true);
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

    closeModal(modalId = 'storage-modal') {
        document.getElementById(modalId).style.display = 'none';
        
        // Reset specific modal state
        if (modalId === 'storage-modal') {
            this.pendingCard = null;
        } else if (modalId === 'trade-offer-modal') {
            this.currentTradeOffer = null;
        }
    }

    addCardWithStorage(storageLocation) {
        if (this.pendingCard) {
            // Get foil status from the modal
            const isFoil = document.getElementById('foil-toggle').checked;
            
            // Store the price information properly
            this.addCardToCollectionSpecific(
                `${this.pendingCard.name}|||${this.pendingCard.setCode}|||${this.pendingCard.collectorNumber}`,
                this.pendingCard.name,
                this.pendingCard.setCode,
                this.pendingCard.collectorNumber,
                this.pendingCard.imageUrl,
                storageLocation,
                isFoil
            );
            
            document.getElementById('quick-add-name').value = '';
            document.getElementById('foil-toggle').checked = false; // Reset foil toggle
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
        const foilClass = card.foil ? 'foil-card' : '';
        const foilText = card.foil ? 'Foil' : 'Normal';
        
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
                <img class="card-image ${imageClass} ${foilClass}" 
                     src="${imageUrl || 'https://via.placeholder.com/200x279?text=No+Image'}" 
                     alt="${card.name}"
                     onerror="this.src='https://via.placeholder.com/200x279/333/fff?text=Card+Image+Not+Found'; this.classList.add('error');"
                     onload="this.classList.remove('loading');">
                <div class="ownership-indicator ${ownershipClass}">${ownershipSymbol}</div>
                ${card.foil ? '<div class="foil-indicator">✨</div>' : ''}
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
                <div class="card-stat">
                    <span class="stat-label">Finish:</span>
                    <span class="stat-value ${card.foil ? 'foil-text' : ''}">${foilText}</span>
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

    addCardToCollectionSpecific(cardIdentifier, cardName, setCode, collectorNumber, imageUrl, storageLocation = 'box_1', isFoil = false) {
        // Create unique identifier for this specific printing (including foil status)
        const uniqueId = `${cardName}|||${setCode}|||${collectorNumber}|||${isFoil ? 'foil' : 'normal'}`;
        let card = this.collection.find(c => `${c.name}|||${c.setCode || ''}|||${c.collectorNumber || ''}|||${c.foil ? 'foil' : 'normal'}` === uniqueId);
        
        if (card) {
            card.quantity++;
            card.owned = true;
            if (storageLocation) card.storage = storageLocation;
            console.log(`Updated existing card: ${cardName} (${isFoil ? 'foil' : 'normal'}) with price $${card.tcgPrice.toFixed(2)}`);
        } else {
            // Get the real price from the pending card
            let tcgPrice = 0;
            if (this.pendingCard && this.pendingCard.name === cardName && this.pendingCard.setCode === setCode && this.pendingCard.collectorNumber === collectorNumber) {
                tcgPrice = this.pendingCard.tcgPrice;
                // Apply foil multiplier (foil cards are typically 2-3x more expensive)
                if (isFoil) {
                    tcgPrice *= 2.5;
                }
                console.log(`Using pending card price: $${tcgPrice} (${isFoil ? 'foil' : 'normal'})`);
            } else {
                // Fallback: try to find the price from search results or use random for demo
                tcgPrice = Math.random() * 50 + 1;
                if (isFoil) {
                    tcgPrice *= 2.5;
                }
                console.log(`Using fallback price: $${tcgPrice} (${isFoil ? 'foil' : 'normal'})`);
            }
            
            card = {
                name: cardName,
                setCode: setCode,
                collectorNumber: collectorNumber,
                tcgPrice: tcgPrice,
                foil: isFoil,
                owned: true,
                quantity: 1,
                storage: storageLocation,
                imageUrl: imageUrl,
                dateAdded: new Date().toISOString()
            };
            this.collection.push(card);
            console.log(`Added new card: ${cardName} (${isFoil ? 'foil' : 'normal'}) with price $${tcgPrice.toFixed(2)}`);
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

    showErrorMessage(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 1rem;
            border-radius: 6px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    // Friend System and Trading Methods
    
    searchFriend(username) {
        // Get all registered users from localStorage
        const users = JSON.parse(localStorage.getItem('mtg_users') || '[]');
       
        const currentUser = this.userManager.getCurrentUser();
        
        // Filter out the current user from search results
        const otherUsers = users.filter(user => user.id !== currentUser.id);
        
        // Search for users matching the username
        const results = otherUsers.filter(user => 
            user.username.toLowerCase().includes(username.toLowerCase()) ||
            (user.displayName && user.displayName.toLowerCase().includes(username.toLowerCase()))
        ).map(user => {
            // Get user's collection data to calculate stats
            const userCollectionKey = `mtgCollection_${user.id}`;
            const userCollection = JSON.parse(localStorage.getItem(userCollectionKey) || '[]');
            const ownedCards = userCollection.filter(card => card.owned);
            const cardCount = ownedCards.reduce((sum, card) => sum + card.quantity, 0);
            const collectionValue = ownedCards.reduce((sum, card) => sum + (card.tcgPrice * card.quantity), 0);
            
            // Get user's profile data
            const profileData = this.loadUserProfile(user.id);
            
            return {
                id: user.id,
                username: user.username,
                displayName: profileData.displayName || user.displayName || user.username,
                cardCount: cardCount,
                collectionValue: collectionValue,
                profilePicture: profileData.profilePicture
            };
        });
        
        this.displayFriendSearchResults(results);
    }
    
    displayFriendSearchResults(results) {
        const resultsContainer = document.getElementById('friend-search-results');
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p style="color: #c7c3be; text-align: center; padding: 2rem;">No users found</p>';
            return;
        }
        
        results.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'friend-result-card';
            
            // Create avatar HTML with profile picture support
            let avatarHTML;
            if (user.profilePicture && user.profilePicture.imageUrl) {
                avatarHTML = `
                    <div class="friend-result-avatar profile-picture">
                        <img src="${user.profilePicture.imageUrl}" 
                             alt="${user.displayName}" 
                             style="transform: scale(${user.profilePicture.scale / 100}) rotate(${user.profilePicture.rotation}deg); 
                                    object-position: ${user.profilePicture.x}% ${user.profilePicture.y}%;"
                             onerror="this.parentElement.innerHTML='${user.displayName.charAt(0)}';">
                    </div>
                `;
            } else {
                avatarHTML = `<div class="friend-result-avatar">${user.displayName.charAt(0)}</div>`;
            }
            
            userCard.innerHTML = `
                <div class="friend-result-info">
                    ${avatarHTML}
                    <div class="friend-result-details">
                        <h4>${user.displayName}</h4>
                        <p>@${user.username}</p>
                        <p>${user.cardCount} cards • $${user.collectionValue.toFixed(2)}</p>
                    </div>
                </div>
                <div class="friend-result-actions">
                    <button class="friend-action-btn primary" onclick="manager.viewFriendCollection('${user.id}', '${user.displayName}')">View Collection</button>
                    <button class="friend-action-btn" onclick="manager.addFriend('${user.id}', '${user.displayName}', '${user.username}')">Add Friend</button>
                </div>
            `;
            resultsContainer.appendChild(userCard);
        });
    }
    
    viewFriendCollection(friendId, friendName) {
        // Get the friend's actual collection from localStorage
        const friendCollectionKey = `mtgCollection_${friendId}`;
        const friendCollection = JSON.parse(localStorage.getItem(friendCollectionKey) || '[]');
        
        // Filter to only show owned cards
        const ownedCards = friendCollection.filter(card => card.owned);
        
        this.currentFriendCollection = ownedCards;
        this.currentFriendId = friendId;
        this.currentFriendName = friendName;
        
        document.getElementById('friend-collection-title').textContent = `${friendName}'s Collection`;
        document.getElementById('friend-collection-count').textContent = `${ownedCards.length} cards`;
        
        const totalValue = ownedCards.reduce((sum, card) => sum + (card.tcgPrice * card.quantity || 0), 0);
        document.getElementById('friend-collection-value').textContent = `$${totalValue.toFixed(2)} total value`;
        
        this.displayFriendCollection(ownedCards);
        document.getElementById('friend-collection-modal').style.display = 'block';
    }
    
    generateMockFriendCollection() {
        const mockCards = [
            { name: 'Lightning Bolt', setCode: 'M21', collectorNumber: '162', tcgPrice: 0.50, foil: false, imageUrl: '' },
            { name: 'Black Lotus', setCode: 'LEA', collectorNumber: '232', tcgPrice: 15000.00, foil: false, imageUrl: '' },
            { name: 'Mox Ruby', setCode: 'LEA', collectorNumber: '265', tcgPrice: 8000.00, foil: false, imageUrl: '' },
            { name: 'Tarmogoyf', setCode: 'MM3', collectorNumber: '141', tcgPrice: 45.00, foil: true, imageUrl: '' },
            { name: 'Snapcaster Mage', setCode: 'MM3', collectorNumber: '55', tcgPrice: 35.00, foil: false, imageUrl: '' },
            { name: 'Jace, the Mind Sculptor', setCode: 'EMA', collectorNumber: '57', tcgPrice: 80.00, foil: true, imageUrl: '' },
            { name: 'Force of Will', setCode: 'EMA', collectorNumber: '49', tcgPrice: 90.00, foil: false, imageUrl: '' },
            { name: 'Liliana of the Veil', setCode: 'MM3', collectorNumber: '76', tcgPrice: 60.00, foil: false, imageUrl: '' }
        ];
        
        return mockCards.map(card => ({
            ...card,
            owned: true,
            quantity: 1,
            storage: 'main_deck',
            setName: this.getSetName(card.setCode),
            rarity: 'mythic'
        }));
    }
    
    getSetName(setCode) {
        const setNames = {
            'M21': 'Core Set 2021',
            'LEA': 'Limited Edition Alpha',
            'MM3': 'Modern Masters 2017',
            'EMA': 'Eternal Masters'
        };
        return setNames[setCode] || 'Unknown Set';
    }
    
    async displayFriendCollection(cards) {
        const grid = document.getElementById('friend-collection-grid');
        grid.innerHTML = '';
        
        for (const card of cards) {
            const cardElement = await this.createFriendCardElement(card);
            grid.appendChild(cardElement);
        }
    }
    
    async createFriendCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        
        const foilClass = card.foil ? 'foil-card' : '';
        const foilText = card.foil ? 'Foil' : 'Normal';
        
        // Try to fetch image from Scryfall
        let imageUrl = card.imageUrl;
        if (!imageUrl && card.name) {
            try {
                const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`);
                const data = await response.json();
                imageUrl = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
                card.imageUrl = imageUrl;
            } catch (error) {
                console.error('Error fetching card image:', error);
            }
        }
        
        const cardIdentifier = `${card.name}|||${card.setCode || ''}|||${card.collectorNumber || ''}`;
        
        cardDiv.innerHTML = `
            <div class="card-name">${card.name}</div>
            ${card.setName ? `<div class="card-set">${card.setName} (${card.setCode}) #${card.collectorNumber}</div>` : ''}
            <div class="card-image-container">
                <img class="card-image owned ${foilClass}" 
                     src="${imageUrl || 'https://via.placeholder.com/200x279?text=No+Image'}" 
                     alt="${card.name}"
                     onerror="this.src='https://via.placeholder.com/200x279/333/fff?text=Card+Image+Not+Found'; this.classList.add('error');"
                     onload="this.classList.remove('loading');">
                <div class="ownership-indicator owned">✓</div>
                ${card.foil ? '<div class="foil-indicator">✨</div>' : ''}
            </div>
            <div class="card-info">
                <div class="card-stat">
                    <span class="stat-label">TCG Price:</span>
                    <span class="stat-value price">$${card.tcgPrice?.toFixed(2) || 'N/A'}</span>
                </div>
                <div class="card-stat">
                    <span class="stat-label">Quantity:</span>
                    <span class="stat-value">${card.quantity || 1}</span>
                </div>
                <div class="card-stat">
                    <span class="stat-label">Finish:</span>
                    <span class="stat-value ${card.foil ? 'foil-text' : ''}">${foilText}</span>
                </div>
                ${card.rarity ? `<div class="card-stat">
                    <span class="stat-label">Rarity:</span>
                    <span class="stat-value">${card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}</span>
                </div>` : ''}
            </div>
            <div class="card-actions">
                <button class="trade-offer-card-btn" onclick="manager.addCardToTradeWant('${cardIdentifier}', '${card.name}', '${card.setCode || ''}', '${card.collectorNumber || ''}', '${card.imageUrl || ''}', ${card.tcgPrice || 0}, ${card.foil || false})">Want for Trade</button>
            </div>
        `;
        
        return cardDiv;
    }
    
    addCardToTradeWant(cardIdentifier, cardName, setCode, collectorNumber, imageUrl, tcgPrice, foil) {
        if (!this.currentTradeOffer) {
            this.currentTradeOffer = {
                friendId: this.currentFriendId,
                friendName: this.currentFriendName,
                wantCards: [],
                offerCards: []
            };
        }
        
        // Check if card is already in want list
        const existingIndex = this.currentTradeOffer.wantCards.findIndex(card => card.identifier === cardIdentifier);
        if (existingIndex !== -1) {
            this.showSuccessMessage('Card already in trade want list');
            return;
        }
        
        const tradeCard = {
            identifier: cardIdentifier,
            name: cardName,
            setCode: setCode,
            collectorNumber: collectorNumber,
            imageUrl: imageUrl,
            tcgPrice: tcgPrice,
            foil: foil
        };
        
        this.currentTradeOffer.wantCards.push(tradeCard);
        this.showSuccessMessage(`Added ${cardName} to trade want list`);
        
        // Open trade offer modal
        document.getElementById('friend-collection-modal').style.display = 'none';
        this.showTradeOfferModal();
    }
    
    showTradeOfferModal() {
        document.getElementById('trade-offer-title').textContent = `Trade with ${this.currentTradeOffer.friendName}`;
        this.updateTradeOfferDisplay();
        document.getElementById('trade-offer-modal').style.display = 'block';
    }
    
    updateTradeOfferDisplay() {
        const yourCardsContainer = document.getElementById('your-trade-cards');
        const wantedCardsContainer = document.getElementById('wanted-trade-cards');
        
        // Display your offer cards
        yourCardsContainer.innerHTML = '';
        if (this.currentTradeOffer.offerCards.length === 0) {
            yourCardsContainer.innerHTML = '<div class="trade-empty-state">No cards selected</div>';
        } else {
            this.currentTradeOffer.offerCards.forEach((card, index) => {
                const cardElement = this.createTradeCardElement(card, index, 'offer');
                yourCardsContainer.appendChild(cardElement);
            });
        }
        
        // Display wanted cards
        wantedCardsContainer.innerHTML = '';
        if (this.currentTradeOffer.wantCards.length === 0) {
            wantedCardsContainer.innerHTML = '<div class="trade-empty-state">No cards selected</div>';
        } else {
            this.currentTradeOffer.wantCards.forEach((card, index) => {
                const cardElement = this.createTradeCardElement(card, index, 'want');
                wantedCardsContainer.appendChild(cardElement);
            });
        }
    }
    
    createTradeCardElement(card, index, type) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'trade-card-item';
        
        cardDiv.innerHTML = `
            <div class="trade-card-info">
                <img class="trade-card-image" src="${card.imageUrl || 'https://via.placeholder.com/30x42?text=?'}" alt="${card.name}">
                <div class="trade-card-details">
                    <div class="trade-card-name">${card.name} ${card.foil ? '(Foil)' : ''}</div>
                    <div class="trade-card-set">${card.setCode} #${card.collectorNumber}</div>
                </div>
            </div>
            <button class="trade-card-remove" onclick="manager.removeCardFromTrade(${index}, '${type}')">Remove</button>
        `;
        
        return cardDiv;
    }
    
    removeCardFromTrade(index, type) {
        if (type === 'offer') {
            this.currentTradeOffer.offerCards.splice(index, 1);
        } else {
            this.currentTradeOffer.wantCards.splice(index, 1);
        }
        this.updateTradeOfferDisplay();
    }
    
    showYourCollectionForTrade() {
        this.displayYourCollectionForTrade();
        document.getElementById('your-collection-modal').style.display = 'block';
    }
    
    async displayYourCollectionForTrade() {
        const grid = document.getElementById('your-collection-grid');
        grid.innerHTML = '';
        
        const ownedCards = this.collection.filter(card => card.owned);
        
        for (const card of ownedCards) {
            const cardElement = await this.createYourTradeCardElement(card);
            grid.appendChild(cardElement);
        }
    }
    
    async createYourTradeCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        
        const foilClass = card.foil ? 'foil-card' : '';
        const foilText = card.foil ? 'Foil' : 'Normal';
        
        let imageUrl = card.imageUrl;
        if (!imageUrl && card.name) {
            try {
                const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`);
                const data = await response.json();
                imageUrl = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
                card.imageUrl = imageUrl;
            } catch (error) {
                console.error('Error fetching card image:', error);
            }
        }
        
        const cardIdentifier = `${card.name}|||${card.setCode || ''}|||${card.collectorNumber || ''}`;
        
        cardDiv.innerHTML = `
            <div class="card-name">${card.name}</div>
            ${card.setName ? `<div class="card-set">${card.setName} (${card.setCode}) #${card.collectorNumber}</div>` : ''}
            <div class="card-image-container">
                <img class="card-image owned ${foilClass}" 
                     src="${imageUrl || 'https://via.placeholder.com/200x279?text=No+Image'}" 
                     alt="${card.name}"
                     onerror="this.src='https://via.placeholder.com/200x279/333/fff?text=Card+Image+Not+Found'; this.classList.add('error');"
                     onload="this.classList.remove('loading');">
                <div class="ownership-indicator owned">✓</div>
                ${card.foil ? '<div class="foil-indicator">✨</div>' : ''}
            </div>
            <div class="card-info">
                <div class="card-stat">
                    <span class="stat-label">TCG Price:</span>
                    <span class="stat-value price">$${card.tcgPrice?.toFixed(2) || 'N/A'}</span>
                </div>
                <div class="card-stat">
                    <span class="stat-label">Quantity:</span>
                    <span class="stat-value">${card.quantity || 1}</span>
                </div>
                <div class="card-stat">
                    <span class="stat-label">Finish:</span>
                    <span class="stat-value ${card.foil ? 'foil-text' : ''}">${foilText}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="trade-offer-card-btn" onclick="manager.addCardToTradeOffer('${cardIdentifier}', '${card.name}', '${card.setCode || ''}', '${card.collectorNumber || ''}', '${card.imageUrl || ''}', ${card.tcgPrice || 0}, ${card.foil || false})">Add to Trade</button>
            </div>
        `;
        
        return cardDiv;
    }
    
    addCardToTradeOffer(cardIdentifier, cardName, setCode, collectorNumber, imageUrl, tcgPrice, foil) {
        if (!this.currentTradeOffer) {
            this.currentTradeOffer = {
                friendId: this.currentFriendId,
                friendName: this.currentFriendName,
                wantCards: [],
                offerCards: []
            };
        }
        
        // Check if card is already in offer list
        const existingIndex = this.currentTradeOffer.offerCards.findIndex(card => card.identifier === cardIdentifier);
        if (existingIndex !== -1) {
            this.showSuccessMessage('Card already in trade offer');
            return;
        }
        
        const tradeCard = {
            identifier: cardIdentifier,
            name: cardName,
            setCode: setCode,
            collectorNumber: collectorNumber,
            imageUrl: imageUrl,
            tcgPrice: tcgPrice,
            foil: foil
        };
        
        this.currentTradeOffer.offerCards.push(tradeCard);
        this.showSuccessMessage(`Added ${cardName} to trade offer`);
        
        // Close your collection modal and update trade display
        document.getElementById('your-collection-modal').style.display = 'none';
        this.updateTradeOfferDisplay();
    }
    
    sendTradeOffer() {
        if (!this.currentTradeOffer || 
            this.currentTradeOffer.offerCards.length === 0 || 
            this.currentTradeOffer.wantCards.length === 0) {
            alert('Please select cards to offer and cards you want before sending the trade.');
            return;
        }
        
        // In a real app, this would send the trade offer to the server
        // For now, we'll just simulate it
        const tradeOffer = {
            id: Date.now().toString(),
            fromUserId: this.userManager.getCurrentUser().id,
            fromUserName: this.userManager.getCurrentUser().username,
            toUserId: this.currentTradeOffer.friendId,
            toUserName: this.currentTradeOffer.friendName,
            offerCards: this.currentTradeOffer.offerCards,
            wantCards: this.currentTradeOffer.wantCards,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Store in localStorage (in a real app, this would be in a database)
        let tradeOffers = JSON.parse(localStorage.getItem('tradeOffers') || '[]');
        tradeOffers.push(tradeOffer);
        localStorage.setItem('tradeOffers', JSON.stringify(tradeOffers));
        
        this.showSuccessMessage(`Trade offer sent to ${this.currentTradeOffer.friendName}!`);
        
        // Close modal and reset trade
        document.getElementById('trade-offer-modal').style.display = 'none';
        this.currentTradeOffer = null;
        this.updateTradeOffersDisplay();
    }
    
    updateTradeOffersDisplay() {
        const currentUser = this.userManager.getCurrentUser();
        const tradeOffers = JSON.parse(localStorage.getItem('tradeOffers') || '[]');
        
        const incomingTrades = tradeOffers.filter(trade => 
            trade.toUserId === currentUser.id && trade.status === 'pending'
        );
        
        const outgoingTrades = tradeOffers.filter(trade => 
            trade.fromUserId === currentUser.id && trade.status === 'pending'
        );
        
        document.getElementById('incoming-count').textContent = incomingTrades.length;
        document.getElementById('outgoing-count').textContent = outgoingTrades.length;
        document.getElementById('user-active-trades').textContent = incomingTrades.length + outgoingTrades.length;
        
        // Display trades based on active tab
        const activeTab = document.querySelector('.trade-tab.active');
        if (activeTab && activeTab.id === 'incoming-trades-tab') {
            this.displayTradeOffers(incomingTrades, 'incoming');
        } else {
            this.displayTradeOffers(outgoingTrades, 'outgoing');
        }
    }
    
    displayTradeOffers(trades, type) {
        const container = document.getElementById('trade-offers-container');
        container.innerHTML = '';
        
        if (trades.length === 0) {
            container.innerHTML = `<div class="trade-empty-state">No ${type} trade offers</div>`;
            return;
        }
        
        trades.forEach(trade => {
            const tradeElement = document.createElement('div');
            tradeElement.className = 'trade-offer-card';
            
            const otherUser = type === 'incoming' ? trade.fromUserName : trade.toUserName;
            const avatarLetter = otherUser.charAt(0).toUpperCase();
            
            tradeElement.innerHTML = `
                <div class="trade-offer-info">
                    <div class="trade-offer-avatar">${avatarLetter}</div>
                    <div class="trade-offer-details">
                        <h4>${type === 'incoming' ? 'Trade from' : 'Trade to'} ${otherUser}</h4>
                        <p>${trade.offerCards.length} cards offered for ${trade.wantCards.length} cards</p>
                        <p>Created: ${new Date(trade.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="trade-offer-actions">
                    <button class="trade-offer-btn" onclick="manager.viewTradeOffer('${trade.id}')">View Details</button>
                    ${type === 'incoming' ? `
                        <button class="trade-offer-btn accept" onclick="manager.acceptTradeOffer('${trade.id}')">Accept</button>
                        <button class="trade-offer-btn decline" onclick="manager.declineTradeOffer('${trade.id}')">Decline</button>
                    ` : `
                        <button class="trade-offer-btn decline" onclick="manager.cancelTradeOffer('${trade.id}')">Cancel</button>
                    `}
                </div>
            `;
            
            container.appendChild(tradeElement);
        });
    }
    
    addFriend(friendId, friendName, friendUsername) {
        const currentUser = this.userManager.getCurrentUser();
        let friends = JSON.parse(localStorage.getItem(`friends_${currentUser.id}`) || '[]');
        
        // Check if already friends
        if (friends.some(friend => friend.id === friendId)) {
            this.showSuccessMessage('Already friends with this user');
            return;
        }
        
        friends.push({
            id: friendId,
            name: friendName,
            username: friendUsername,
            addedAt: new Date().toISOString()
        });
        
        localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(friends));
        this.showSuccessMessage(`Added ${friendName} as a friend!`);
        this.displayFriends();
    }
    
    displayFriends() {
        const currentUser = this.userManager.getCurrentUser();
        const friends = JSON.parse(localStorage.getItem(`friends_${currentUser.id}`) || '[]');
        const friendsList = document.getElementById('friends-list');
        
        friendsList.innerHTML = '';
        
        if (friends.length === 0) {
            friendsList.innerHTML = '<div class="trade-empty-state">No friends added yet</div>';
            return;
        }
        
        friends.forEach(friend => {
            const friendCard = document.createElement('div');
            friendCard.className = 'friend-card';
            
            // Get friend's profile data
            const friendProfileData = this.loadUserProfile(friend.id);
            
            // Create avatar HTML with profile picture support
            let avatarHTML;
            if (friendProfileData.profilePicture && friendProfileData.profilePicture.imageUrl) {
                avatarHTML = `
                    <div class="friend-card-avatar profile-picture">
                        <img src="${friendProfileData.profilePicture.imageUrl}" 
                             alt="${friend.name}" 
                             style="transform: scale(${friendProfileData.profilePicture.scale / 100}) rotate(${friendProfileData.profilePicture.rotation}deg); 
                                    object-position: ${friendProfileData.profilePicture.x}% ${friendProfileData.profilePicture.y}%;"
                             onerror="this.parentElement.innerHTML='${friend.name.charAt(0)}';">
                    </div>
                `;
            } else {
                avatarHTML = `<div class="friend-card-avatar">${friend.name.charAt(0)}</div>`;
            }
            
            friendCard.innerHTML = `
                <div class="friend-card-info">
                    ${avatarHTML}
                    <div class="friend-card-details">
                        <h4>${friendProfileData.displayName || friend.name}</h4>
                        <p>@${friend.username}</p>
                    </div>
                </div>
                <div class="friend-card-actions">
                    <button class="friend-card-btn" onclick="manager.viewFriendCollection('${friend.id}', '${friend.name}')">View Collection</button>
                    <button class="friend-card-btn" onclick="manager.removeFriend('${friend.id}')">Remove</button>
                </div>
            `;
            
            friendsList.appendChild(friendCard);
        });
    }
    
    removeFriend(friendId) {
        const currentUser = this.userManager.getCurrentUser();
        let friends = JSON.parse(localStorage.getItem(`friends_${currentUser.id}`) || '[]');
        
        friends = friends.filter(friend => friend.id !== friendId);
        localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(friends));
        
        this.showSuccessMessage('Friend removed');
        this.displayFriends();
    }
    
    // Profile Page Methods
    displayProfile() {
        const currentUser = this.userManager.getCurrentUser();
        if (!currentUser) return;

        // Load user profile data
        const profileData = this.loadUserProfile(currentUser.id);
        
        // Update current profile display
        document.getElementById('profile-username').textContent = profileData.displayName || currentUser.username;
        document.getElementById('profile-status').textContent = profileData.statusMessage || 'No status message';
        
        // Update profile avatar
        const profileImage = document.getElementById('current-profile-image');
        const profileInitial = document.getElementById('current-profile-initial');
        
        if (profileData.profilePicture) {
            profileImage.src = profileData.profilePicture.imageUrl;
            profileImage.style.display = 'block';
            profileImage.style.transform = `scale(${profileData.profilePicture.scale / 100}) rotate(${profileData.profilePicture.rotation}deg)`;
            profileImage.style.objectPosition = `${profileData.profilePicture.x}% ${profileData.profilePicture.y}%`;
            profileInitial.style.display = 'none';
        } else {
            profileImage.style.display = 'none';
            profileInitial.style.display = 'block';
            profileInitial.textContent = currentUser.username.charAt(0).toUpperCase();
        }
        
        // Update profile settings form
        document.getElementById('profile-display-name').value = profileData.displayName || '';
        document.getElementById('profile-status-message').value = profileData.statusMessage || '';
        document.getElementById('profile-visibility').value = profileData.visibility || 'public';
        
        // Setup profile event listeners
        this.setupProfileEventListeners();
    }
    
    setupProfileEventListeners() {
        // Profile card search
        document.getElementById('profile-search-btn').addEventListener('click', () => {
            this.searchProfileCards();
        });
        
        document.getElementById('profile-card-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchProfileCards();
            }
        });
        
        // Profile customization controls
        document.getElementById('artwork-scale').addEventListener('input', (e) => {
            this.updateArtworkPreview();
            document.getElementById('scale-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('artwork-rotation').addEventListener('input', (e) => {
            this.updateArtworkPreview();
            document.getElementById('rotation-value').textContent = e.target.value + '°';
        });
        
        document.getElementById('artwork-x').addEventListener('input', (e) => {
            this.updateArtworkPreview();
            document.getElementById('x-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('artwork-y').addEventListener('input', (e) => {
            this.updateArtworkPreview();
            document.getElementById('y-value').textContent = e.target.value + '%';
        });
        
        // Profile action buttons
        document.getElementById('reset-artwork-btn').addEventListener('click', () => {
            this.resetArtworkCustomization();
        });
        
        document.getElementById('save-profile-btn').addEventListener('click', () => {
            this.saveProfilePicture();
        });
        
        document.getElementById('cancel-profile-btn').addEventListener('click', () => {
            this.cancelProfileCustomization();
        });
        
        document.getElementById('save-profile-settings-btn').addEventListener('click', () => {
            this.saveProfileSettings();
        });
    }
    
    async searchProfileCards() {
        const searchTerm = document.getElementById('profile-card-search').value.trim();
        if (!searchTerm) return;
        
        const resultsContainer = document.getElementById('profile-card-results');
        resultsContainer.innerHTML = '<div class="loading">Searching for cards...</div>';
        
        try {
            // Use the same card search as the main collection
            const searchResults = await this.simulateCardSearch(searchTerm);
            
            resultsContainer.innerHTML = '';
            
            if (searchResults.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #c7c3be;">No cards found</p>';
                return;
            }
            
            searchResults.forEach(card => {
                const cardOption = document.createElement('div');
                cardOption.className = 'profile-card-option';
                cardOption.innerHTML = `
                    <img src="${card.imageUrl}" alt="${card.name}" onerror="this.src='/placeholder-card.png';">
                    <h4>${card.name}</h4>
                    <p>${card.setCode} • ${card.rarity}</p>
                `;
                cardOption.addEventListener('click', () => this.selectProfileCard(card));
                resultsContainer.appendChild(cardOption);
            });
        } catch (error) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #dc3545;">Error searching for cards</p>';
        }
    }
    
    selectProfileCard(card) {
        this.selectedProfileCard = card;
        
        // Show customization section
        document.querySelector('.profile-customization-section').style.display = 'block';
        
        // Update selected artwork
        const artworkImg = document.getElementById('selected-artwork');
        artworkImg.src = card.imageUrl;
        
        // Reset customization controls
        this.resetArtworkCustomization();
        
        // Scroll to customization section
        document.querySelector('.profile-customization-section').scrollIntoView({ behavior: 'smooth' });
    }
    
    updateArtworkPreview() {
        const artworkImg = document.getElementById('selected-artwork');
        const scale = document.getElementById('artwork-scale').value;
        const rotation = document.getElementById('artwork-rotation').value;
        const x = document.getElementById('artwork-x').value;
        const y = document.getElementById('artwork-y').value;
        
        artworkImg.style.transform = `scale(${scale / 100}) rotate(${rotation}deg)`;
        artworkImg.style.objectPosition = `${x}% ${y}%`;
    }
    
    resetArtworkCustomization() {
        document.getElementById('artwork-scale').value = 100;
        document.getElementById('artwork-rotation').value = 0;
        document.getElementById('artwork-x').value = 0;
        document.getElementById('artwork-y').value = 0;
        
        document.getElementById('scale-value').textContent = '100%';
        document.getElementById('rotation-value').textContent = '0°';
        document.getElementById('x-value').textContent = '0%';
        document.getElementById('y-value').textContent = '0%';
        
        this.updateArtworkPreview();
    }
    
    saveProfilePicture() {
        if (!this.selectedProfileCard) return;
        
        const currentUser = this.userManager.getCurrentUser();
        const profileData = this.loadUserProfile(currentUser.id);
        
        const profilePicture = {
            cardId: this.selectedProfileCard.id,
            imageUrl: this.selectedProfileCard.imageUrl,
            cardName: this.selectedProfileCard.name,
            scale: parseInt(document.getElementById('artwork-scale').value),
            rotation: parseInt(document.getElementById('artwork-rotation').value),
            x: parseInt(document.getElementById('artwork-x').value),
            y: parseInt(document.getElementById('artwork-y').value)
        };
        
        profileData.profilePicture = profilePicture;
        this.saveUserProfile(currentUser.id, profileData);
        
        // Update current profile display
        this.displayProfile();
        
        // Update header avatar
        this.updateHeaderAvatar();
        
        // Hide customization section
        document.querySelector('.profile-customization-section').style.display = 'none';
        
        this.showSuccessMessage('Profile picture updated successfully!');
    }
    
    cancelProfileCustomization() {
        document.querySelector('.profile-customization-section').style.display = 'none';
        this.selectedProfileCard = null;
    }
    
    saveProfileSettings() {
        const currentUser = this.userManager.getCurrentUser();
        const profileData = this.loadUserProfile(currentUser.id);
        
        profileData.displayName = document.getElementById('profile-display-name').value.trim();
        profileData.statusMessage = document.getElementById('profile-status-message').value.trim();
        profileData.visibility = document.getElementById('profile-visibility').value;
        
        this.saveUserProfile(currentUser.id, profileData);
        
        // Update displays
        this.displayProfile();
        this.displayUsers(); // Update user info on Users tab
        
        this.showSuccessMessage('Profile settings saved successfully!');
    }
    
    loadUserProfile(userId) {
        const key = `profile_${userId}`;
        const profileData = localStorage.getItem(key);
        return profileData ? JSON.parse(profileData) : {
            displayName: '',
            statusMessage: '',
            visibility: 'public',
            profilePicture: null
        };
    }
    
    saveUserProfile(userId, profileData) {
        const key = `profile_${userId}`;
        localStorage.setItem(key, JSON.stringify(profileData));
    }
    
    updateHeaderAvatar() {
        const currentUser = this.userManager.getCurrentUser();
        if (!currentUser) return;
        
        const profileData = this.loadUserProfile(currentUser.id);
        const headerAvatar = document.getElementById('current-user-avatar');
        
        if (profileData.profilePicture && headerAvatar) {
            // If there's a profile picture, we might want to show it in the header too
            // For now, we'll just update the initial
            headerAvatar.textContent = (profileData.displayName || currentUser.username).charAt(0).toUpperCase();
        }
    }
    
    // ...existing code...
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing manager...');
    
    try {
        console.log('Creating UserSessionManager...');
        const userManager = new UserSessionManager();
        console.log('UserSessionManager created successfully');
        
        console.log('Creating MTGCollectionManager...');
        window.manager = new MTGCollectionManager();
        console.log('MTGCollectionManager created successfully');
        
        window.mtgCollection = window.manager; // Create alias for button onclick handlers
        
        console.log('Manager created successfully:', window.manager);
        console.log('Calling init...');
        
        // Initialize the manager (this sets up event listeners)
        window.manager.init();
        console.log('Manager initialized successfully');
        
        // Test basic functionality
        console.log('Testing basic methods...');
        console.log('Current user:', window.manager.userManager.getCurrentUser());
        console.log('Is guest:', window.manager.userManager.isGuest());
        
    } catch (error) {
        console.error('Error initializing manager:', error);
        console.error('Error stack:', error.stack);
        
        // Fallback: try to add basic event listeners
        console.log('Attempting fallback event listeners...');
        const collectionTab = document.getElementById('collection-tab');
        if (collectionTab) {
            collectionTab.addEventListener('click', () => {
                console.log('Fallback: Collection tab clicked');
                // Removed alert for cleaner UX
            });
        } else {
            console.error('Collection tab not found!');
        }
        
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                console.log('Fallback: Search button clicked');
                alert('Search button clicked (fallback)');
                // Removed alert for cleaner UX
            });
        } else {
            console.error('Search button not found!');
        }
    }
});

// Add some sample data for demonstration
document.addEventListener('DOMContentLoaded', () => {
    // Add sample cards if collection is empty
    setTimeout(async () => {
        if (manager.collection.length === 0) {
            const sampleCards = [
                { name: 'Lightning Bolt', owned: true, quantity: 4, storage: 'main_deck', tcgPrice: 0.50 },
                { name: 'Counterspell', owned: true, quantity: 2, storage: 'trade_binder', tcgPrice: 0.25 },
                { name: 'Black Lotus', owned: false, quantity: 0, storage: null, tcgPrice: 15000.00 },
                { name: 'Tarmogoyf', owned: true, quantity: 1, storage: 'deck_box', tcgPrice: 45.00, foil: true },
                { name: 'Snapcaster Mage', owned: true, quantity: 3, storage: 'main_deck', tcgPrice: 35.00 }
            ];
            
            for (const card of sampleCards) {
                const existingIndex = manager.collection.findIndex(c => c.name === card.name);
                if (existingIndex === -1) {
                    manager.collection.push(card);
                }
            }
            
            manager.saveCollection();
            manager.displayCollection();
        }
    }, 100);
});

// Test basic button functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Testing button functionality...');
    
    setTimeout(() => {
        const collectionTab = document.getElementById('collection-tab');
        if (collectionTab) {
            console.log('Collection tab found:', collectionTab);
            collectionTab.style.border = '2px solid red'; // Visual indicator
            
            // Test manual click
            collectionTab.addEventListener('click', (e) => {
                console.log('Manual click detected on collection tab');
                e.preventDefault();
                // Removed alert for cleaner UX
            });
        } else {
            console.error('Collection tab not found!');
        }
        
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            console.log('Search button found:', searchBtn);
            searchBtn.style.border = '2px solid blue'; // Visual indicator
            
            searchBtn.addEventListener('click', (e) => {
                console.log('Manual click detected on search button');
                e.preventDefault();
                // Removed alert for cleaner UX
            });
        } else {
            console.error('Search button not found!');
        }
        
    }, 500);
});
