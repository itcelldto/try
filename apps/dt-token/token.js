
        // Google Sheets API configuration
        const SPREADSHEET_ID = '11AWbKR2rR2YQYm6AdjEQsw-na9QObL0wfw6eAi4MEdM';
        const API_KEY = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
        const SHEET_NAME = '101';
        const SETTINGS_SHEET = 'settings';
        
        // Configuration for max tokens to show
        const MAX_TOKENS_TO_SHOW = {
            desktop: 6,
            tablet: 4,
            mobile: 3
        };
        
        // Fallback data in case API fails
        const FALLBACK_DATA = {
            "Section 1": { currentToken: 25, queuedTokens: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
            "Section 2": { currentToken: 18, queuedTokens: [19, 20, 21, 22, 23, 24] },
            "Section 3": { currentToken: 32, queuedTokens: [] }, // No queue
            "Section 4": { currentToken: 15, queuedTokens: [16, 17, 18, 19, 20, 21, 22, 23] },
            "Section 5": { currentToken: 22, queuedTokens: [] }, // No queue
            "Section 6": { currentToken: 10, queuedTokens: [11, 12, 13, 14, 15] }
        };
        
        // Store previous token data for comparison
        let previousTokenData = {};
        let fetchRetryCount = 0;
        const MAX_RETRIES = 3;
        
        // Function to get max tokens to show based on screen width
        function getMaxTokensToShow() {
            const width = window.innerWidth;
            if (width <= 768) {
                return MAX_TOKENS_TO_SHOW.mobile;
            } else if (width <= 1200) {
                return MAX_TOKENS_TO_SHOW.tablet;
            } else {
                return MAX_TOKENS_TO_SHOW.desktop;
            }
        }
        
        // Function to fetch data from Google Sheets with error handling
        async function fetchTokenData() {
            try {
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                fetchRetryCount = 0; // Reset retry count on success
                return processData(data.values);
            } catch (error) {
                console.error('Error fetching data:', error);
                fetchRetryCount++;
                
                // If we have previous data and retries exceeded, use it
                if (Object.keys(previousTokenData).length > 0 && fetchRetryCount >= MAX_RETRIES) {
                    console.log('Using previously loaded data due to repeated failures');
                    return previousTokenData;
                }
                
                // Otherwise use fallback data
                if (fetchRetryCount >= MAX_RETRIES) {
                    console.log('Using fallback data');
                    return FALLBACK_DATA;
                }
                
                return null;
            }
        }
        
        // Process the data from Google Sheets
        function processData(values) {
            if (!values || values.length < 2) return FALLBACK_DATA;
            
            // Extract headers and rows
            const headers = values[0];
            const rows = values.slice(1);
            
            // Create a map to organize tokens by section
            const sectionsMap = {};
            
            // Process each row
            rows.forEach(row => {
                if (row.length < headers.length) return;
                
                const section = row[1]; // Column B: section
                const tokenNo = parseInt(row[2]); // Column C: tokenNo
                const status = row[5]; // Column F: status
                
                if (!section || !tokenNo) return;
                
                if (!sectionsMap[section]) {
                    sectionsMap[section] = {
                        currentToken: null,
                        queuedTokens: []
                    };
                }
                
                if (status === 'Pass') {
                    // Update current token to the highest passed token
                    if (!sectionsMap[section].currentToken || tokenNo > sectionsMap[section].currentToken) {
                        sectionsMap[section].currentToken = tokenNo;
                    }
                } else if (status === 'In Que') {
                    // Add to queued tokens
                    if (!sectionsMap[section].queuedTokens.includes(tokenNo)) {
                        sectionsMap[section].queuedTokens.push(tokenNo);
                    }
                }
            });
            
            // Sort queued tokens for each section
            for (const section in sectionsMap) {
                sectionsMap[section].queuedTokens.sort((a, b) => a - b);
                
                // If no current token found, use the highest queued minus 1
                if (!sectionsMap[section].currentToken && sectionsMap[section].queuedTokens.length > 0) {
                    sectionsMap[section].currentToken = sectionsMap[section].queuedTokens[0] - 1;
                }
            }
            
            return Object.keys(sectionsMap).length > 0 ? sectionsMap : FALLBACK_DATA;
        }
        
        // Sort sections - those with queue first, then those without
        function sortSections(sectionsData) {
            const sectionsWithQueue = [];
            const sectionsWithoutQueue = [];
            
            // Separate sections based on queue status
            for (const section in sectionsData) {
                if (sectionsData[section].queuedTokens && sectionsData[section].queuedTokens.length > 0) {
                    sectionsWithQueue.push(section);
                } else {
                    sectionsWithoutQueue.push(section);
                }
            }
            
            // Sort each group by section number
            const sortByNumber = (a, b) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numA - numB;
            };
            
            sectionsWithQueue.sort(sortByNumber);
            sectionsWithoutQueue.sort(sortByNumber);
            
            // Combine: sections with queue first, then sections without queue
            return [...sectionsWithQueue, ...sectionsWithoutQueue];
        }
        
        // Generate the HTML table from processed data
        function generateTable(data) {
            if (!data || Object.keys(data).length === 0) {
                return '<div class="error-message">No token data available</div>';
            }
            
            // Sort sections: with queue first, without queue last
            const sortedSections = sortSections(data);
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Current Token</th>
                            <th>In Queue</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            // Get max tokens to show based on current screen size
            const maxTokens = getMaxTokensToShow();
            
            // Iterate through sorted sections
            for (const section of sortedSections) {
                const sectionData = data[section];
                const hasQueue = sectionData.queuedTokens && sectionData.queuedTokens.length > 0;
                const rowClass = hasQueue ? '' : 'no-queue-row';
                
                // Create queued tokens HTML
                let queuedTokensHtml = '<div class="queued-tokens-container"><div class="queued-tokens-wrapper">';
                
                if (hasQueue) {
                    // Show only limited tokens based on screen size
                    const tokensToShow = sectionData.queuedTokens.slice(0, maxTokens);
                    const remainingTokens = sectionData.queuedTokens.length - maxTokens;
                    
                    tokensToShow.forEach(token => {
                        queuedTokensHtml += `<span class="queued-token">${token}</span>`;
                    });
                    
                    // Add "more" indicator if there are remaining tokens
                    if (remainingTokens > 0) {
                        queuedTokensHtml += `<span class="more-tokens-indicator" title="${remainingTokens} more tokens">+${remainingTokens}</span>`;
                    }
                } else {
                    queuedTokensHtml += '<span class="no-queue-message">No tokens in queue</span>';
                }
                
                queuedTokensHtml += '</div></div>';
                
                html += `
                    <tr class="${rowClass}">
                        <td style="font-size: 2.5vw; font-weight: bold;">${section}</td>
                        <td class="current-token">${sectionData.currentToken || '--'}</td>
                        <td>${queuedTokensHtml}</td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
            `;
            
            return html;
        }
        
        // Update the table with new data
        async function updateTable() {
            try {
                const data = await fetchTokenData();
                if (data) {
                    previousTokenData = data;
                    document.getElementById('token-table').innerHTML = generateTable(data);
                }
            } catch (error) {
                console.error('Error updating table:', error);
                // Show error but keep previous data
                if (Object.keys(previousTokenData).length > 0) {
                    document.getElementById('token-table').innerHTML = generateTable(previousTokenData);
                } else {
                    document.getElementById('token-table').innerHTML = 
                        '<div class="error-message">Connection error. Please check your network.</div>';
                }
            }
        }
        
        // Update date and time function
        function updateDateTime() {
            const now = new Date();
            
            // Format date: Day, DD Month YYYY
            const dateOptions = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const dateStr = now.toLocaleDateString('en-US', dateOptions);
            
            // Format time: HH:MM:SS
            const timeStr = now.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            document.getElementById('date-display').textContent = dateStr;
            document.getElementById('time-display').textContent = timeStr;
        }
        
        // Update scroll reel content
        async function updateScrollReel() {
            try {
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SETTINGS_SHEET}!C2:C?key=${API_KEY}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    const content = processScrollReelData(data.values);
                    const container = document.getElementById('scroll-reel-container');
                    const contentElement = document.getElementById('scroll-reel-content');
                    
                    if (content && content.trim() !== '') {
                        contentElement.textContent = content;
                        container.style.display = 'block';
                    } else {
                        container.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error fetching scroll reel:', error);
                document.getElementById('scroll-reel-container').style.display = 'none';
            }
        }
        
        function processScrollReelData(values) {
            if (!values || values.length === 0) return null;
            
            let content = '';
            for (let i = 0; i < values.length; i++) {
                if (values[i] && values[i][0] && values[i][0].trim() !== '') {
                    content += values[i][0] + ' • ';
                }
            }
            
            if (content.endsWith(' • ')) {
                content = content.slice(0, -3);
            }
            
            return content;
        }
        
        // Initial load
        window.addEventListener('load', function() {
            updateDateTime();
            updateTable();
            updateScrollReel();
            
            // Set up periodic refresh
            setInterval(updateDateTime, 1000);
            setInterval(updateTable, 2000);
            setInterval(updateScrollReel, 30000);
            
            // Update table on window resize to adjust token display
            window.addEventListener('resize', function() {
                updateTable();
            });
        });
    
