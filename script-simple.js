// Simplified script to test basic functionality
console.log('Script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // Test basic button functionality
    const collectionTab = document.getElementById('collection-tab');
    const searchBtn = document.getElementById('search-btn');
    
    console.log('Elements found:', { collectionTab, searchBtn });
    
    if (collectionTab) {
        collectionTab.addEventListener('click', (e) => {
            console.log('Collection tab clicked');
            e.preventDefault();
            alert('Collection tab works!');
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            console.log('Search button clicked');
            e.preventDefault();
            alert('Search button works!');
        });
    }
    
    console.log('Event listeners added');
});
