        // ── i18n ──────────────────────────────────────────────────────────────
        let currentLang = 'en';
        let TRANSLATIONS = null; // loaded from translations.json at startup
        function t(key, ...args) {
            if (!TRANSLATIONS) return key;
            const tr = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
            const val = tr[key] !== undefined ? tr[key] : (TRANSLATIONS.en[key] ?? key);
            if (typeof val === 'string' && args.length > 0) {
                return val.replace(/\{(\d+)\}/g, (_, i) => args[+i] ?? '');
            }
            return val ?? key;
        }
        function applyTranslations() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                el.textContent = t(el.dataset.i18n);
            });
            // update select option texts
            document.querySelectorAll('select#periodSelect option[data-i18n]').forEach(opt => {
                opt.textContent = t(opt.dataset.i18n);
            });
            const a = document.getElementById('langActive');
            const i = document.getElementById('langInactive');
            if (a) a.textContent = currentLang === 'en' ? t('langLabelEn') : t('langLabelTr');
            if (i) i.textContent = currentLang === 'en' ? t('langLabelTr') : t('langLabelEn');
            // update document title
            document.title = t('pageTitle_doc');
            // set aria-labels on sliders
            const startSlider = document.getElementById('startSlider');
            if (startSlider) startSlider.setAttribute('aria-label', t('ariaStartDate'));
            const endSlider = document.getElementById('endSlider');
            if (endSlider) endSlider.setAttribute('aria-label', t('ariaEndDate'));
            // set aria-label on modal close button
            const closeBtn = document.getElementById('rwModalClose');
            if (closeBtn) closeBtn.setAttribute('aria-label', t('ariaClose'));
            // swap rolling window image src + alt
            const rwImg = document.querySelector('.rw-modal-img');
            if (rwImg) { rwImg.src = t('rwImg'); rwImg.alt = t('altRwImage'); }
            // update notes textarea
            const botSpecs = document.getElementById('botSpecs');
            if (botSpecs) botSpecs.value = t('botSpecsContent');
            // refresh any currently-visible tooltip texts
            document.querySelectorAll('.help-icon').forEach(icon => {
                const key = icon.dataset.helpKey;
                if (!key) return;
                const tooltip = icon.querySelector('.help-tooltip');
                if (tooltip) tooltip.textContent = getHelpTexts()[key] || '';
            });
        }
        function toggleLanguage() {
            currentLang = currentLang === 'en' ? 'tr' : 'en';
            applyTranslations();
            buildEquityChart();
            latestIterPeriod = -1;
            periodicResults = {};
            analyzeData();
            displayRawData();
            setTimeout(matchHistoryHeight, 100);
        }
        // ── End i18n ──────────────────────────────────────────────────────────

        // Help tooltip text dictionary (edit these texts as needed)
        function getHelpTexts() {
            return {
                bpTitle:              t('help_leverage'),
                leverage:             t('help_leverage'),
                initialMoney:         t('help_initialMoney', 100),
                rollingPeriod:        t('help_rollingPeriod'),
                dateRange:            t('help_dateRange'),
                performanceAnalysis:  t('help_performanceAnalysis'),
                tradingHistory:       t('help_tradingHistory'),
                metricSuccessful:     t('help_metricSuccessful'),
                metricLosing:         t('help_metricLosing'),
                metricBuyHold:        t('help_metricBuyHold', initialMoney),
                metricFinalValue:     t('help_metricFinalValue', initialMoney),
                metricRollingAvg:     t('help_metricRollingAvg'),
                metricRollingMin:     t('help_metricRollingMin'),
                metricRollingMax:     t('help_metricRollingMax'),
                equityCurve:          t('help_equityCurve'),
            };
        }

        function positionHelpTooltip(icon, tooltip) {
            const margin = 12;
            const gap = 10;
            const iconRect = icon.getBoundingClientRect();

            tooltip.classList.add('visible');

            const maxTooltipWidth = Math.min(360, Math.max(120, window.innerWidth - iconRect.right - margin - gap));
            tooltip.style.maxWidth = `${maxTooltipWidth}px`;

            const tooltipRect = tooltip.getBoundingClientRect();

            let left = iconRect.right + gap;
            if (left + tooltipRect.width > window.innerWidth - margin) {
                left = window.innerWidth - tooltipRect.width - margin;
            }
            left = Math.max(margin, left);

            let top = iconRect.top + (iconRect.height / 2) - (tooltipRect.height / 2);
            top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }

        function refreshVisibleTooltips() {
            document.querySelectorAll('.help-tooltip.visible').forEach((tooltip) => {
                const icon = tooltip.parentElement;
                if (icon && icon.classList.contains('help-icon')) {
                    positionHelpTooltip(icon, tooltip);
                }
            });
        }

        const ROLLING_MODAL_KEYS = new Set(['rollingPeriod', 'metricRollingAvg', 'metricRollingMin', 'metricRollingMax']);

        function openRwModal() {
            document.getElementById('rwModal').classList.add('active');
        }

        function closeRwModal() {
            document.getElementById('rwModal').classList.remove('active');
        }

        document.getElementById('rwModalClose').addEventListener('click', closeRwModal);
        document.getElementById('rwModal').addEventListener('click', function(e) {
            if (e.target === this) closeRwModal();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeRwModal();
        });

        function initializeHelpTooltips() {
            const helpIcons = document.querySelectorAll('.help-icon');

            helpIcons.forEach((icon) => {
                if (icon.dataset.helpBound === '1') return;

                const tooltip = icon.querySelector('.help-tooltip');
                if (!tooltip) return;

                const key = icon.dataset.helpKey;
                if (key && getHelpTexts()[key]) {
                    tooltip.textContent = getHelpTexts()[key];
                }

                const showTooltip = () => {
                    const text = getHelpTexts()[key];
                    if (text) tooltip.textContent = text;
                    positionHelpTooltip(icon, tooltip);
                };

                const hideTooltip = () => {
                    tooltip.classList.remove('visible');
                };

                icon.addEventListener('mouseenter', showTooltip);
                icon.addEventListener('mouseleave', hideTooltip);
                icon.addEventListener('focusin', showTooltip);
                icon.addEventListener('focusout', hideTooltip);

                if (ROLLING_MODAL_KEYS.has(key)) {
                    icon.style.cursor = 'pointer';
                    icon.addEventListener('click', function(e) {
                        e.stopPropagation();
                        hideTooltip();
                        openRwModal();
                    });
                }

                icon.dataset.helpBound = '1';
            });

            window.addEventListener('scroll', refreshVisibleTooltips, true);
            window.addEventListener('resize', refreshVisibleTooltips);
        }

        function loadBotSpecs() {
            const saved = localStorage.getItem('tradingBotSpecs');
            if (saved) {
                document.getElementById('botSpecs').value = saved;
            }
        }

        // Global variables
        let tradeTables = [];
        let priceData = [];
        let minDate = null;
        let maxDate = null;
        let startDate = null;
        let endDate = null;
        let iterPeriod = 365;
        let lastSelectedPeriod = 365; // Store last selected period for auto-recalculation
        let latestIterPeriod = -1;
        let periodicResults = {};
        let leverage = 2; // Default leverage set to 2x
        let initialMoney = 100; // Default initial money

        // Initialize
        window.addEventListener('load', async function() {
            try {
                const res = await fetch('./translations.json');
                TRANSLATIONS = await res.json();
            } catch(e) {
                console.error('Failed to load translations:', e);
                TRANSLATIONS = { en: {}, tr: {} };
            }
            applyTranslations();
            initializeHelpTooltips();
            loadRepositoryData();
        });

        // Slider handlers
        document.getElementById('startSlider').addEventListener('input', updateStartDate);
        document.getElementById('endSlider').addEventListener('input', updateEndDate);
        document.getElementById('periodSelect').addEventListener('change', updateRollingPeriod);
        document.getElementById('leverageSelect').addEventListener('change', updateLeverage);
        document.getElementById('initialMoneyInput').addEventListener('change', updateInitialMoney);
        document.getElementById('initialMoneyInput').addEventListener('keydown', function(e) {
            // Allow: backspace, delete, tab, escape, enter, arrow keys
            if ([8,9,13,27,46,37,38,39,40].indexOf(e.keyCode) !== -1) return;
            // Block anything that isn't a digit
            if (e.key < '0' || e.key > '9') e.preventDefault();
        });
        document.getElementById('initialMoneyInput').addEventListener('input', function() {
            // Strip any non-digit characters as they type
            this.value = this.value.replace(/[^0-9]/g, '');
        });

        function updateInitialMoney() {
            const input = document.getElementById('initialMoneyInput');
            let val = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
            if (isNaN(val) || val < 100) {
                val = 100;
                input.value = 100;
            }
            initialMoney = val;
            latestIterPeriod = -1;
            periodicResults = {};
            analyzeData();
            buildEquityChart();
            setTimeout(matchHistoryHeight, 100);
        }

        function updateLeverage() {
            leverage = parseInt(document.getElementById('leverageSelect').value);

            // When leverage changes, force rolling-window recalculation on next analysis
            if (iterPeriod > 0) {
                iterPeriod = lastSelectedPeriod;
                latestIterPeriod = -1;
                periodicResults = {};
            }

            // Recalculate all results with new leverage - same as date updates
            analyzeData();
            displayRawData();
            buildEquityChart();

            // Match heights after content update
            setTimeout(matchHistoryHeight, 100);
        }

        // Range slider collision prevention
        document.getElementById('startSlider').addEventListener('input', function() {
            const startVal = parseInt(this.value);
            const endVal = parseInt(document.getElementById('endSlider').value);
            if (startVal >= endVal) {
                document.getElementById('endSlider').value = Math.min(startVal + 1, parseInt(this.max));
            }
        });
        
        document.getElementById('endSlider').addEventListener('input', function() {
            const startVal = parseInt(document.getElementById('startSlider').value);
            const endVal = parseInt(this.value);
            if (endVal <= startVal) {
                document.getElementById('startSlider').value = Math.max(endVal - 1, 0);
            }
        });
        
        // Window resize handler to recalculate heights
        window.addEventListener('resize', function() {
            setTimeout(matchHistoryHeight, 100);
            buildEquityChart();
        });

        async function loadRepositoryData() {
            try {
                // Load trade data from repository
                const tradeResponse = await fetch('./executor_bot_decisions.csv');
                if (!tradeResponse.ok) throw new Error(t('errLoadTrades', tradeResponse.status));
                const tradeText = await tradeResponse.text();
                const tradeData = parseCSV(tradeText);
                
                if (tradeData.length === 0) throw new Error(t('errNoTrades'));
                
                tradeTables = [{ name: 'Executor Bot Results', data: tradeData }];
                
                // Load price data from repository
                const priceResponse = await fetch('./executor_bot_prices.csv');
                if (!priceResponse.ok) throw new Error(t('errLoadPrices', priceResponse.status));
                const priceText = await priceResponse.text();
                priceData = parseCSV(priceText);
                
                if (priceData.length === 0) throw new Error(t('errNoPrices'));
                
                priceData.sort((a, b) => new Date(a.CANDLE_START) - new Date(b.CANDLE_START));
                
                // Calculate date range and setup
                calculateDateRange();
                setupSliders();
                
                // Start analysis
                analyzeData();
                displayRawData();
                
                // Load saved data and match heights after initial load
                loadBotSpecs();
                setTimeout(matchHistoryHeight, 200);
                setTimeout(buildEquityChart, 300);
                
            } catch (error) {
                console.error('Load error:', error);
                document.getElementById('executorResults').innerHTML = `<div class="error">${t('errLoadData', error.message)}</div>`;
                document.getElementById('csvTableHead').innerHTML = `<tr><td colspan="100%" style="text-align: center; padding: 20px; color: #ff6b6b;">${t('errLoadDataShort', error.message)}</td></tr>`;
            }
        }

        function parseCSV(text) {
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',');
                    const row = {};
                    headers.forEach((header, index) => {
                        let value = values[index] ? values[index].trim() : '';
                        
                        if (value === '') {
                            row[header] = '';
                            return;
                        }
                        
                        // Parse dates
                        if (header === 'TRADE_START' || header === 'TRADE_END' || header.includes('DATE')) {
                            try {
                                const parsedDate = new Date(value);
                                if (isNaN(parsedDate.getTime())) {
                                    value = '';
                                } else {
                                    value = parsedDate;
                                }
                            } catch (error) {
                                value = '';
                            }
                        }
                        // Parse numbers
                        else if ((header.includes('PRICE') || header.includes('PERCENT') || header === 'MONEY') && 
                                 !isNaN(value) && value !== '') {
                            value = parseFloat(value);
                        }
                        
                        row[header] = value;
                    });
                    data.push(row);
                }
            }
            return data;
        }

        function calculateDateRange() {
            if (tradeTables.length === 0) return;

            try {
                // Use trade starts for minimum date,
                // but extend maximum to cover last trade and last price candle
                const tradeDates = tradeTables.flatMap(table =>
                    table.data
                        .map(row => new Date(row.TRADE_START))
                        .filter(date => !isNaN(date.getTime()))
                );

                if (tradeDates.length === 0) throw new Error('No valid trade dates found');

                let minTime = Math.min(...tradeDates.map(d => d.getTime()));
                let maxTime = Math.max(...tradeDates.map(d => d.getTime()));

                // Also consider TRADE_END where present
                const tradeEndDates = tradeTables.flatMap(table =>
                    table.data
                        .map(row => row.TRADE_END instanceof Date ? row.TRADE_END : (row.TRADE_END ? new Date(row.TRADE_END) : null))
                        .filter(date => date && !isNaN(date.getTime()))
                );
                if (tradeEndDates.length > 0) {
                    const tradeEndMax = Math.max(...tradeEndDates.map(d => d.getTime()));
                    if (tradeEndMax > maxTime) {
                        maxTime = tradeEndMax;
                    }
                }

                // Finally, extend to last available price candle if it is later
                if (priceData.length > 0) {
                    const priceDates = priceData
                        .map(row => new Date(row.CANDLE_START))
                        .filter(date => !isNaN(date.getTime()));

                    if (priceDates.length > 0) {
                        const priceMax = Math.max(...priceDates.map(d => d.getTime()));
                        if (priceMax > maxTime) {
                            maxTime = priceMax;
                        }
                    }
                }

                minDate = new Date(minTime);
                maxDate = new Date(maxTime);
                startDate = new Date(minDate);
                endDate = new Date(maxDate);

            } catch (error) {
                console.error('Error calculating date range:', error);
                const now = new Date();
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                minDate = oneYearAgo;
                maxDate = now;
                startDate = new Date(minDate);
                endDate = new Date(maxDate);
            }
        }

        function setupSliders() {
            const daysRange = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
            
            document.getElementById('startSlider').max = daysRange;
            document.getElementById('endSlider').max = daysRange;
            document.getElementById('startSlider').value = 0;
            document.getElementById('endSlider').value = daysRange;
            
            updateDateLabels();
        }

        function updateDateLabels() {
            document.getElementById('startDateLabel').textContent = startDate.toISOString().split('T')[0];
            document.getElementById('endDateLabel').textContent = endDate.toISOString().split('T')[0];
            updateRangeVisual();
        }

        function updateRangeVisual() {
            const startSlider = document.getElementById('startSlider');
            const endSlider = document.getElementById('endSlider');
            const container = document.querySelector('.range-slider-container');
            
            if (startSlider && endSlider && container) {
                const startVal = parseInt(startSlider.value);
                const endVal = parseInt(endSlider.value);
                const max = parseInt(startSlider.max);
                
                const leftPercent = (startVal / max) * 100;
                const rightPercent = (endVal / max) * 100;
                
                const existingStyle = document.querySelector('#range-style');
                if (existingStyle) {
                    existingStyle.remove();
                }
                
                const style = document.createElement('style');
                style.textContent = `
                    .range-slider-container::after {
                        left: ${leftPercent}%;
                        width: ${rightPercent - leftPercent}%;
                    }
                `;
                style.id = 'range-style';
                document.head.appendChild(style);
            }
        }

        function updateStartDate(event) {
            const value = parseInt(event.target.value);
            startDate = new Date(minDate.getTime() + value * 24 * 60 * 60 * 1000);
            
            // Keep last selected rolling period and recalculate
            if (lastSelectedPeriod > 0) {
                iterPeriod = lastSelectedPeriod;
                latestIterPeriod = -1; // Force recalculation
            }
            
            updateDateLabels();
            analyzeData();
            displayRawData();
            
            // Match heights after content update
            setTimeout(matchHistoryHeight, 100);
        }

        function updateEndDate(event) {
            const value = parseInt(event.target.value);
            endDate = new Date(minDate.getTime() + value * 24 * 60 * 60 * 1000);
            
            // Keep last selected rolling period and recalculate
            if (lastSelectedPeriod > 0) {
                iterPeriod = lastSelectedPeriod;
                latestIterPeriod = -1; // Force recalculation
            }
            
            updateDateLabels();
            analyzeData();
            displayRawData();
            
            // Match heights after content update
            setTimeout(matchHistoryHeight, 100);
        }

        function updateRollingPeriod() {
            const selectedPeriod = document.getElementById('periodSelect');
            iterPeriod = selectedPeriod.value ? parseInt(selectedPeriod.value) : 0;
            lastSelectedPeriod = iterPeriod; // Store the selection
            latestIterPeriod = -1;
            periodicResults = {};
            analyzeData();
            
            // Match heights after content update
            setTimeout(matchHistoryHeight, 100);
        }

        // --- Layout helpers ---
        function matchHistoryHeight() {
            // Only match heights on desktop layout
            if (window.innerWidth >= 1200) {
                const tablesColumn = document.querySelector('.tables-column');
                const historySection = document.querySelector('.history-section');
                
                if (tablesColumn && historySection) {
                    // Reset height to auto first
                    historySection.style.height = 'auto';

                    // Match full left column height
                    const totalHeight = tablesColumn.offsetHeight;

                    // Set history section height to match
                    historySection.style.height = totalHeight + 'px';
                }
            } else {
                // Reset height on mobile
                const historySection = document.querySelector('.history-section');
                if (historySection) {
                    historySection.style.height = 'auto';
                }
            }
        }

        function formatWholeNumber(value) {
            if (value === 'N/A' || value === '-' || value === undefined || value === null) {
                return value;
            }

            const numericValue = typeof value === 'number' ? value : parseFloat(value);
            if (Number.isFinite(numericValue)) {
                return String(Math.round(numericValue));
            }

            return value;
        }

        function analyzeData() {
            if (tradeTables.length === 0 || priceData.length === 0) return;

            try {
                tradeTables.forEach((table, index) => {
                    const filtered = table.data.filter(row => {
                        const tradeDate = new Date(row.TRADE_START);
                        if (isNaN(tradeDate.getTime()) || !startDate || !endDate) {
                            return false;
                        }
                        return tradeDate >= startDate && tradeDate <= endDate;
                    });

                    // Fill NaN values
                    filtered.forEach(row => {
                        if (isNaN(row.PROFIT_PERCENT)) row.PROFIT_PERCENT = 0;
                    });

                    const buyData = filtered.filter(row => row.TRADE_TYPE === 'buy');
                    const sellData = filtered.filter(row => row.TRADE_TYPE === 'sell');

                    const buyWins = buyData.filter(row => row.PROFIT_PERCENT > 0).length;
                    const buyLosses = buyData.filter(row => row.PROFIT_PERCENT < 0).length;
                    const sellWins = sellData.filter(row => row.PROFIT_PERCENT > 0).length;
                    const sellLosses = sellData.filter(row => row.PROFIT_PERCENT < 0).length;

                    // Calculate averages with leverage applied
                    const buyWinAvg = buyWins > 0 ? (buyData.filter(row => row.PROFIT_PERCENT > 0).reduce((sum, row) => sum + (row.PROFIT_PERCENT * leverage), 0) / buyWins).toFixed(2) : '0.00';
                    const buyLossAvg = buyLosses > 0 ? (buyData.filter(row => row.PROFIT_PERCENT < 0).reduce((sum, row) => sum + (row.PROFIT_PERCENT * leverage), 0) / buyLosses).toFixed(2) : '0.00';
                    const sellWinAvg = sellWins > 0 ? (sellData.filter(row => row.PROFIT_PERCENT > 0).reduce((sum, row) => sum + (row.PROFIT_PERCENT * leverage), 0) / sellWins).toFixed(2) : '0.00';
                    const sellLossAvg = sellLosses > 0 ? (sellData.filter(row => row.PROFIT_PERCENT < 0).reduce((sum, row) => sum + (row.PROFIT_PERCENT * leverage), 0) / sellLosses).toFixed(2) : '0.00';

                    // Calculate final money with leverage applied
                    let money = initialMoney;
                    for (const row of filtered) {
                        money *= (1 + (row.PROFIT_PERCENT * leverage) / 100);
                    }
                    money = Math.round(money * 100) / 100;

                    // Buy & Hold calculation
                    let buyAndHold = 'N/A';
                    if (priceData.length > 0 && startDate && endDate) {
                        const startPrice = findClosestPrice(startDate);
                        const endPrice = findClosestPrice(endDate);
                        
                        if (startPrice && endPrice && startPrice > 0) {
                            buyAndHold = Math.round(initialMoney * endPrice / startPrice * 100) / 100;
                        }
                    }

                    // Periodic Analysis
                    const shouldCalculateRolling = iterPeriod > 0;
                    
                    if (shouldCalculateRolling && iterPeriod !== latestIterPeriod) {
                        calculatePeriodicAnalysis(table, index);
                    } else if (!shouldCalculateRolling) {
                        periodicResults[index] = { avg: undefined, min: undefined, max: undefined };
                    }

                    // Combined position stats
                    const totalSuccessful = buyWins + sellWins;
                    const totalLosing = buyLosses + sellLosses;
                    const combinedSuccessfulAvg = totalSuccessful > 0 ? 
                        Math.round((buyWins * parseFloat(buyWinAvg) + sellWins * parseFloat(sellWinAvg)) / totalSuccessful) : 0;
                    const combinedLosingAvg = totalLosing > 0 ? 
                        Math.round((buyLosses * parseFloat(buyLossAvg) + sellLosses * parseFloat(sellLossAvg)) / totalLosing) : 0;

                    // Minimum (worst) single losing trade
                    const allLosingRows = [
                        ...buyData.filter(row => row.PROFIT_PERCENT < 0),
                        ...sellData.filter(row => row.PROFIT_PERCENT < 0)
                    ];
                    const minLoss = allLosingRows.length > 0
                        ? Math.round(Math.min(...allLosingRows.map(row => row.PROFIT_PERCENT * leverage)))
                        : 0;

                    // Max drawdown from sequential equity curve
                    const sortedFiltered = [...filtered].sort((a, b) => new Date(a.TRADE_START) - new Date(b.TRADE_START));
                    let ddMoney = initialMoney;
                    let ddPeak = initialMoney;
                    let maxDrawdownPct = 0;
                    for (const row of sortedFiltered) {
                        ddMoney *= (1 + (row.PROFIT_PERCENT * leverage) / 100);
                        if (ddMoney > ddPeak) ddPeak = ddMoney;
                        const drawdown = (ddMoney - ddPeak) / ddPeak * 100;
                        if (drawdown < maxDrawdownPct) maxDrawdownPct = drawdown;
                    }
                    const maxDrawdown = Math.round(maxDrawdownPct);
                    
                    // Rolling metrics
                    let rollingMetrics;
                    if (iterPeriod > 0 && periodicResults[index] && periodicResults[index].avg !== undefined) {
                        rollingMetrics = [
                            { label: t('avgRolling'), subLabel: t('startBalanceSub', initialMoney), value: formatWholeNumber(periodicResults[index].avg), helpKey: 'metricRollingAvg' },
                            { label: t('minRolling'), subLabel: t('startBalanceSub', initialMoney), value: formatWholeNumber(periodicResults[index].min), helpKey: 'metricRollingMin' },
                            { label: t('maxRolling'), subLabel: t('startBalanceSub', initialMoney), value: formatWholeNumber(periodicResults[index].max), helpKey: 'metricRollingMax' }
                        ];
                    } else {
                        rollingMetrics = [
                            { label: t('avgRolling'), subLabel: t('startBalanceSub', initialMoney), value: 'N/A', helpKey: 'metricRollingAvg' },
                            { label: t('minRolling'), subLabel: t('startBalanceSub', initialMoney), value: 'N/A', helpKey: 'metricRollingMin' },
                            { label: t('maxRolling'), subLabel: t('startBalanceSub', initialMoney), value: 'N/A', helpKey: 'metricRollingMax' }
                        ];
                    }

                    // Main metrics
                    const mainMetrics = [
                        { label: t('successfulPos'), subLabel: t('avgSub', combinedSuccessfulAvg), value: formatWholeNumber(totalSuccessful), helpKey: 'metricSuccessful', sectionBreak: true },
                        { label: t('losingPos'), subLabel: t('avgMinSub', combinedLosingAvg, minLoss, maxDrawdown), value: formatWholeNumber(totalLosing), helpKey: 'metricLosing' },
                        { label: t('buyHold'), subLabel: t('startBalanceSub', initialMoney), value: formatWholeNumber(buyAndHold), helpKey: 'metricBuyHold' },
                        { label: t('finalValue'), subLabel: t('startBalanceSub', initialMoney), value: formatWholeNumber(money), helpKey: 'metricFinalValue' }
                    ];

                    const combinedMetrics = [...rollingMetrics, ...mainMetrics];
                    createTable(document.getElementById('executorResults'), 'Performance Analysis', combinedMetrics);
                });

                latestIterPeriod = iterPeriod;
            } catch (error) {
                console.error('Error in analyzeData:', error);
            }
        }

        function findClosestPrice(targetDate) {
            if (priceData.length === 0) return null;
            
            let closest = priceData[0];
            let minDiff = Math.abs(new Date(closest.CANDLE_START) - targetDate);
            
            for (const row of priceData) {
                const diff = Math.abs(new Date(row.CANDLE_START) - targetDate);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = row;
                }
            }
            
            return closest.CLOSE_PRICE;
        }

        function calculatePeriodicAnalysis(table, tableIndex) {
            if (priceData.length === 0 || !startDate || !endDate) return;
            
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endDate);
            end.setDate(end.getDate() - iterPeriod);
            end.setHours(0, 0, 0, 0);
            
            if (start > end || ((endDate - startDate) / (1000 * 60 * 60 * 24)) < iterPeriod) {
                periodicResults[tableIndex] = { avg: undefined, min: undefined, max: undefined };
                return;
            }
            
            const results = [];
            const current = new Date(start);
            
            while (current <= end) {
                let moneyIter = initialMoney;
                const endWindow = new Date(current);
                endWindow.setDate(endWindow.getDate() + iterPeriod);
                
                for (const row of table.data) {
                    const tradeDate = new Date(row.TRADE_START);
                    if (tradeDate >= current && tradeDate < endWindow) {
                        if (!isNaN(row.PROFIT_PERCENT)) {
                            moneyIter *= (1 + (row.PROFIT_PERCENT * leverage) / 100);
                        }
                    }
                }

                results.push(Math.round(moneyIter * 100) / 100);
                current.setDate(current.getDate() + 1);
            }
            
            if (!periodicResults[tableIndex]) {
                periodicResults[tableIndex] = {};
            }
            
            periodicResults[tableIndex].avg = results.length > 0 ? 
                Math.round(results.reduce((a, b) => a + b, 0) / results.length * 100) / 100 : undefined;
            periodicResults[tableIndex].min = results.length > 0 ? Math.min(...results) : undefined;
            periodicResults[tableIndex].max = results.length > 0 ? Math.max(...results) : undefined;
        }

        function createTable(container, title, metrics, keepControls = false) {
            const skipTitle = container.dataset.noTitle === '1';
            const titleElement = skipTitle ? null : container.querySelector('.table-title');
            const controlsElement = container.querySelector('.rolling-controls');
            const cleanedTitleHTML = skipTitle
                ? ''
                : (titleElement
                    ? titleElement.outerHTML.replace(/\sdata-help-bound="1"/g, '')
                    : `<div class="table-title">${title}</div>`);
            
            let tableHTML = '';
            if (!skipTitle && (!keepControls || !controlsElement)) {
                tableHTML += cleanedTitleHTML;
            }
            
            if (keepControls && controlsElement) {
                tableHTML += controlsElement.outerHTML;
            }
            
            tableHTML += `
                <table class="results-table">
                    <thead>
                        <tr><th>${t('metricCol')}</th><th>${t('valueCol')}</th></tr>
                    </thead>
                    <tbody>
                        ${metrics.map((metric) => {
                            const rowClass = metric.sectionBreak ? 'section-break' : '';
                            const subLine = metric.subLabel ? `<div class="metric-subtext">(${metric.subLabel})</div>` : '';
                            const helpIcon = metric.helpKey ? `<span class="help-icon" data-help-key="${metric.helpKey}">?<span class="help-tooltip"></span></span>` : '';
                            return `<tr class="${rowClass}"><td class="metric-name"><div class="metric-label-wrap">${helpIcon}<div><div class="metric-text">${metric.label}</div>${subLine}</div></div></td><td class="metric-value">${metric.value}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `;
            
            container.innerHTML = tableHTML;
            initializeHelpTooltips();
            
            // Re-attach event listener for rolling period select if it exists
            if (keepControls) {
                const newSelect = container.querySelector('#periodSelect');
                if (newSelect) {
                    newSelect.addEventListener('change', updateRollingPeriod);
                }
            }
        }

        function displayRawData() {
            if (tradeTables.length === 0) return;

            const headerLabels = {
                TRADE_TYPE: t('colPosition'),
                TRADE_START: t('colEntryDate'),
                START_PRICE: t('colEntryPrice'),
                TRADE_END: t('colCloseDate'),
                STOP_PRICE: t('colClosePrice'),
                PROFIT_PERCENT: t('colROI')
            };

            let tradeData = tradeTables[0].data;
            
            // Filter by date range
            if (startDate && endDate) {
                tradeData = tradeData.filter(row => {
                    const tradeDate = new Date(row.TRADE_START);
                    if (isNaN(tradeDate.getTime())) {
                        return false;
                    }
                    return tradeDate >= startDate && tradeDate <= endDate;
                });
            }

            const csvTableHead = document.getElementById('csvTableHead');
            const csvTableBody = document.getElementById('csvTableBody');

            if (tradeData.length > 0) {
                const headers = Object.keys(tradeData[0]).filter(header => header !== 'MONEY');
                csvTableHead.innerHTML = '<tr>' + headers.map(header => `<th>${headerLabels[header] || header}</th>`).join('') + '</tr>';

                csvTableBody.innerHTML = '';
                const sortedData = [...tradeData].sort((a, b) => {
                    const dateA = new Date(a.TRADE_START);
                    const dateB = new Date(b.TRADE_START);
                    return dateB - dateA;
                });
                
                sortedData.forEach(row => {
                    const tr = document.createElement('tr');
                    headers.forEach(header => {
                        const td = document.createElement('td');
                        let value = row[header];
                        
                        if (value === undefined || value === null || value === '' || 
                            (typeof value === 'number' && isNaN(value))) {
                            value = '-';
                        }
                        else if (header === 'TRADE_START' || header === 'TRADE_END') {
                            try {
                                if (value instanceof Date && !isNaN(value.getTime())) {
                                    value = value.toISOString().split('T')[0] + ' ' + 
                                           value.toTimeString().slice(0, 5);
                                } else if (typeof value === 'string' && value !== '') {
                                    const parsedDate = new Date(value);
                                    if (!isNaN(parsedDate.getTime())) {
                                        value = parsedDate.toISOString().split('T')[0] + ' ' + 
                                               parsedDate.toTimeString().slice(0, 5);
                                    } else {
                                        value = '-';
                                    }
                                } else {
                                    value = '-';
                                }
                            } catch (error) {
                                value = '-';
                            }
                        }
                        else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                            if (header === 'START_PRICE' || header === 'STOP_PRICE') {
                                value = '$' + Math.round(value).toLocaleString('en-US');
                            } else if (header === 'PROFIT_PERCENT') {
                                value = (value * leverage).toFixed(2) + '%';
                                if (value.includes('-')) {
                                    td.classList.add('profit-negative');
                                } else if (parseFloat(value) > 0) {
                                    td.classList.add('profit-positive');
                                }
                            } else {
                                value = Math.round(value).toLocaleString('en-US');
                            }
                        }
                        else if (header === 'TRADE_TYPE' && typeof value === 'string') {
                            const normalized = value.trim().toLowerCase();
                            if (normalized === 'buy') {
                                value = t('posLong', leverage);
                            } else if (normalized === 'sell') {
                                value = t('posShort', leverage);
                            }
                        }
                        else if (typeof value === 'string' && value.trim() === '') {
                            value = '-';
                        }
                        
                        td.textContent = value;
                        tr.appendChild(td);
                    });
                    csvTableBody.appendChild(tr);
                });
            } else {
                csvTableHead.innerHTML = `<tr><td colspan="100%" style="text-align: center; padding: 20px;">${t('noTrades')}</td></tr>`;
                csvTableBody.innerHTML = '';
            }
        }
        // ── Equity Curve Chart ──────────────────────────────────────
        let equityPeriodMonths = 12;

        function buildEquityChart() {
            if (!tradeTables || tradeTables.length === 0) return;
            const canvas = document.getElementById('equityChart');
            if (!canvas) return;

            const sortedRows = tradeTables[0].data
                .filter(row => row.TRADE_END instanceof Date && !isNaN(row.TRADE_END.getTime()) && typeof row.PROFIT_PERCENT === 'number')
                .sort((a, b) => a.TRADE_END - b.TRADE_END);

            let runningMoney = initialMoney;
            const allPoints = [];
            for (const row of sortedRows) {
                runningMoney *= (1 + (row.PROFIT_PERCENT * leverage) / 100);
                allPoints.push({ date: row.TRADE_END, value: Math.round(runningMoney * 100) / 100 });
            }

            if (allPoints.length === 0) return;

            let points = allPoints;
            if (equityPeriodMonths > 0) {
                const cutoff = new Date(allPoints[allPoints.length - 1].date);
                cutoff.setMonth(cutoff.getMonth() - equityPeriodMonths);
                points = allPoints.filter(p => p.date >= cutoff);
                if (points.length === 0) points = allPoints;
            }

            const wrap = canvas.parentElement;
            const W = wrap.clientWidth;
            const H = wrap.clientHeight || 340;
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, W, H);

            const PAD_L = 56, PAD_R = 58, PAD_T = 20, PAD_B = 48;
            const cW = W - PAD_L - PAD_R;
            const cH = H - PAD_T - PAD_B;

            const tMin = points[0].date.getTime();
            const tMax = points[points.length - 1].date.getTime();
            const tRange = tMax - tMin || 1;
            const pxFn = t => PAD_L + (t - tMin) / tRange * cW;

            // ── Build BTC points early so we can include them in shared scale ──
            const btcPointsRaw = priceData
                .filter(r => r.CANDLE_START && typeof r.CLOSE_PRICE === 'number')
                .map(r => ({ ts: new Date(r.CANDLE_START), price: r.CLOSE_PRICE }))
                .filter(r => !isNaN(r.ts.getTime()) && r.ts.getTime() >= tMin && r.ts.getTime() <= tMax)
                .sort((a, b) => a.ts - b.ts);

            // ── Shared ratio scale: both series expressed as value/firstValue ──
            const eqBase = points[0].value;
            const btcBase = btcPointsRaw.length > 0 ? btcPointsRaw[0].price : null;

            const eqRatios  = points.map(p => p.value / eqBase);
            const btcRatios = btcBase ? btcPointsRaw.map(p => p.price / btcBase) : [];

            const allRatios = [...eqRatios, ...btcRatios];
            const loR = Math.max(0, Math.min(...allRatios) * 0.9);
            const hiR = Math.max(...allRatios) * 1.1;
            const rRange = hiR - loR || 1;
            const pyFn = r => PAD_T + (1 - (r - loR) / rRange) * cH;

            // helper: nice ticks for ratio axis (expressed as portfolio $ for left, BTC $ for right)
            function niceRatioTicks(base) {
                const loV = loR * base, hiV = hiR * base;
                const span = hiV - loV || 1;
                const rawStep = span / 6;
                const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
                const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => span / s <= 8) || mag * 10;
                const ticks = [];
                for (let v = Math.ceil(loV / step) * step; v <= hiV; v += step) ticks.push(v);
                return ticks;
            }

            // ── Left grid lines + portfolio labels ──
            const eqTicks = niceRatioTicks(eqBase);
            ctx.lineWidth = 1;
            eqTicks.forEach(v => {
                const r = v / eqBase;
                const gy = pyFn(r);
                if (gy < PAD_T || gy > H - PAD_B) return;
                ctx.strokeStyle = '#2a2f3a';
                ctx.beginPath(); ctx.moveTo(PAD_L, gy); ctx.lineTo(W - PAD_R, gy); ctx.stroke();
                ctx.fillStyle = '#9da5b4';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'right';
                const lbl = v >= 1e6 ? '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' :
                             v >= 1e3 ? '$' + (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K' :
                             '$' + v.toFixed(0);
                ctx.fillText(lbl, PAD_L - 6, gy + 4);
            });

            // Left Y axis label (rotated)
            ctx.save();
            ctx.fillStyle = '#9da5b4';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.translate(12, PAD_T + cH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(t('equityYLeft'), 0, 0);
            ctx.restore();

            // X-axis date labels + vertical grid
            ctx.fillStyle = '#9da5b4';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            const tickCount = Math.max(2, Math.min(8, Math.floor(cW / 85)));
            const tickTimes = Array.from({ length: tickCount + 1 }, (_, i) => tMin + (i / tickCount) * tRange);
            const tickDates = tickTimes.map(ti => new Date(ti));
            // find which YYYY-MM keys appear more than once so we can add days to disambiguate
            const mKeys = tickDates.map(d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
            const mCount = {};
            mKeys.forEach(k => { mCount[k] = (mCount[k] || 0) + 1; });
            tickTimes.forEach((ti, i) => {
                const xp = pxFn(ti);
                const d = tickDates[i];
                const mk = mKeys[i];
                // if this month appears multiple times, append the day to distinguish
                const lbl = mCount[mk] > 1
                    ? mk + '-' + String(d.getDate()).padStart(2, '0')
                    : mk;
                ctx.fillStyle = '#9da5b4';
                ctx.fillText(lbl, xp, H - PAD_B + 18);
                ctx.strokeStyle = '#2a2f3a';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(xp, PAD_T);
                ctx.lineTo(xp, H - PAD_B);
                ctx.stroke();
            });

            // Fill under line
            ctx.beginPath();
            ctx.moveTo(pxFn(points[0].date.getTime()), pyFn(points[0].value / eqBase));
            points.forEach(p => ctx.lineTo(pxFn(p.date.getTime()), pyFn(p.value / eqBase)));
            ctx.lineTo(pxFn(points[points.length - 1].date.getTime()), H - PAD_B);
            ctx.lineTo(pxFn(points[0].date.getTime()), H - PAD_B);
            ctx.closePath();
            const grad = ctx.createLinearGradient(0, PAD_T, 0, H - PAD_B);
            grad.addColorStop(0, '#3d7eff33');
            grad.addColorStop(1, '#3d7eff00');
            ctx.fillStyle = grad;
            ctx.fill();

            // Line
            ctx.beginPath();
            ctx.strokeStyle = '#3d7eff';
            ctx.lineWidth = 2;
            points.forEach((p, i) => {
                const xp = pxFn(p.date.getTime()), yp = pyFn(p.value / eqBase);
                i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
            });
            ctx.stroke();

            // Dots
            ctx.fillStyle = '#5b9dff';
            points.forEach(p => {
                ctx.beginPath();
                ctx.arc(pxFn(p.date.getTime()), pyFn(p.value / eqBase), 3.5, 0, Math.PI * 2);
                ctx.fill();
            });

            canvas._eqPoints = points;
            canvas._eqPx = pxFn;
            canvas._eqPy = pyFn;
            canvas._eqBase = eqBase;

            // BTC: draw using shared ratio scale
            const btcPoints = btcPointsRaw;
            if (btcBase && btcPoints.length > 1) {
                // BTC line using shared pyFn with ratio
                ctx.beginPath();
                ctx.strokeStyle = '#f7931a';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.7;
                btcPoints.forEach((p, i) => {
                    const xp = pxFn(p.ts.getTime()), yp = pyFn(p.price / btcBase);
                    i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
                });
                ctx.stroke();
                ctx.globalAlpha = 1.0;

                // Right Y axis: BTC $ labels at the same ratio ticks as portfolio
                const btcTicks = niceRatioTicks(btcBase);
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                btcTicks.forEach(v => {
                    const r = v / btcBase;
                    const gy = pyFn(r);
                    if (gy < PAD_T || gy > H - PAD_B) return;
                    // dashed orange grid line
                    ctx.save();
                    ctx.setLineDash([3, 4]);
                    ctx.strokeStyle = '#f7931a22';
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(PAD_L, gy); ctx.lineTo(W - PAD_R, gy); ctx.stroke();
                    ctx.restore();
                    // tick mark
                    ctx.strokeStyle = '#f7931a88';
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(W - PAD_R, gy); ctx.lineTo(W - PAD_R + 5, gy); ctx.stroke();
                    const lbl = v >= 1e6 ? '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' :
                                v >= 1e3 ? '$' + (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K' :
                                '$' + v.toFixed(0);
                    ctx.fillStyle = '#f7931a';
                    ctx.fillText(lbl, W - PAD_R + 8, gy + 4);
                });

                // right axis border line
                ctx.strokeStyle = '#f7931a33';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(W - PAD_R, PAD_T);
                ctx.lineTo(W - PAD_R, H - PAD_B);
                ctx.stroke();

                // Right Y axis label (rotated)
                ctx.save();
                ctx.fillStyle = '#f7931a';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.translate(W - 10, PAD_T + cH / 2);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(t('chartBtc'), 0, 0);
                ctx.restore();

                canvas._btcPoints = btcPoints;
                canvas._btcPx = pxFn;
                canvas._btcBase = btcBase;
                canvas._tMin = tMin;
                canvas._tRange = tRange;
                canvas._padL = PAD_L;
                canvas._cW = cW;
            }

            // store pad constants for overlay
            canvas._padT = PAD_T;
            canvas._padB = PAD_B;

            // Update subtitle
            const sub = document.getElementById('equitySubtitle');
            if (sub) sub.textContent = `(${t('equitySubStart')}: $${initialMoney.toLocaleString('en-US')} · ${t('equitySubLeverage')}: ${leverage}x)`;

            // notify overlay
            if (typeof window._postBuildEquityChart === 'function') window._postBuildEquityChart();

            // ── Per-period ROI labels on buttons ──
            (function() {
                const allBtcSorted = priceData
                    .filter(r => r.CANDLE_START && typeof r.CLOSE_PRICE === 'number')
                    .map(r => ({ ts: new Date(r.CANDLE_START), price: r.CLOSE_PRICE }))
                    .filter(r => !isNaN(r.ts.getTime()))
                    .sort((a, b) => a.ts - b.ts);

                function fmtRoi(v) {
                    const abs = Math.abs(v);
                    const n = abs >= 1000 ? (abs / 1000).toFixed(2) + 'K%' : abs.toFixed(2) + '%';
                    return (v >= 0 ? '+' : '-') + n;
                }

                const lastPt = allPoints[allPoints.length - 1];

                document.querySelectorAll('.equity-period-btn').forEach(btn => {
                    const months = parseInt(btn.dataset.months) || 0;
                    const portEl = btn.querySelector('.epb-roi-port');
                    const btcEl  = btn.querySelector('.epb-roi-btc');
                    if (!portEl || !btcEl) return;

                    let pts, cutoff;
                    if (months === 0) {
                        pts = allPoints;
                    } else {
                        cutoff = new Date(lastPt.date);
                        cutoff.setMonth(cutoff.getMonth() - months);
                        pts = allPoints.filter(p => p.date >= cutoff);
                    }

                    if (pts.length >= 2) {
                        const roi = (pts[pts.length - 1].value / pts[0].value - 1) * 100;
                        const col = roi >= 0 ? '#00e676' : '#ff4757';
                        portEl.innerHTML = `<span style="color:#7eb8ff;font-size:0.62rem">${t('chartBot')}</span> <b style="color:${col}">${fmtRoi(roi)}</b>`;
                    } else {
                        portEl.innerHTML = `<span style="color:#555">${t('chartBotNoData')}</span>`;
                    }

                    const btcSlice = months === 0
                        ? allBtcSorted.filter(r => r.ts >= allPoints[0].date)
                        : allBtcSorted.filter(r => r.ts >= cutoff);

                    if (btcSlice.length >= 2) {
                        const roi = (btcSlice[btcSlice.length - 1].price / btcSlice[0].price - 1) * 100;
                        const col = roi >= 0 ? '#00e676' : '#ff4757';
                        btcEl.innerHTML = `<span style="color:#f7931a;font-size:0.62rem">${t('chartBtc')}</span> <b style="color:${col}">${fmtRoi(roi)}</b>`;
                    } else {
                        btcEl.innerHTML = `<span style="color:#555">${t('chartBtcNoData')}</span>`;
                    }
                });
            })();
        }

        // Period buttons
        document.querySelectorAll('.equity-period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.equity-period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                equityPeriodMonths = parseInt(btn.dataset.months) || 0;
                buildEquityChart();
            });
        });

        // Hover tooltip + drag selection
        // Desktop: left-click drag to select period; hover for price tooltip
        // Mobile: tap for price tooltip; long-press (500ms) + drag to select period
        (function () {
            const canvas = document.getElementById('equityChart');
            const overlay = document.getElementById('equityOverlay');
            const tooltip = document.getElementById('equityTooltip');
            const selStats = document.getElementById('equitySelStats');
            if (!canvas || !overlay || !tooltip || !selStats) return;

            let sel = null; // { x0, x1 } in canvas px, or null
            let dragging = false;
            let dragStart = null;

            // touch state
            let touchTimer = null;
            let touchSelDragging = false;
            let touchOrigin = null;

            function syncOverlaySize() {
                overlay.width = canvas.width;
                overlay.height = canvas.height;
            }

            function canvasX(e) {
                const r = canvas.getBoundingClientRect();
                return (e.clientX - r.left) * (canvas.width / r.width);
            }

            function touchCanvasX(touch) {
                const r = canvas.getBoundingClientRect();
                return (touch.clientX - r.left) * (canvas.width / r.width);
            }

            function tsAtX(cx) {
                return canvas._tMin + ((cx - canvas._padL) / canvas._cW) * canvas._tRange;
            }

            function closestEq(ts) {
                const pts = canvas._eqPoints;
                if (!pts) return null;
                let best = pts[0], bd = Infinity;
                pts.forEach(p => { const d = Math.abs(p.date.getTime() - ts); if (d < bd) { bd = d; best = p; } });
                return best;
            }

            function closestBtc(ts) {
                const pts = canvas._btcPoints;
                if (!pts || !pts.length) return null;
                let best = pts[0], bd = Infinity;
                pts.forEach(p => { const d = Math.abs(p.ts.getTime() - ts); if (d < bd) { bd = d; best = p; } });
                return best;
            }

            function pct(a, b) {
                if (!a || !b || a === 0) return null;
                return ((b - a) / Math.abs(a) * 100);
            }

            function fmtPct(v) {
                if (v === null) return '-';
                const sign = v >= 0 ? '+' : '';
                return `<b style="color:${v >= 0 ? '#00e676' : '#ff4757'}">${sign}${v.toFixed(2)}%</b>`;
            }

            function fmtVal(v) {
                return v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' :
                       v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v.toFixed(2);
            }

            function showTooltipAt(cx, clientX, clientY) {
                if (!canvas._eqPoints) return;
                const pts = canvas._eqPoints;
                const pxFn = canvas._eqPx;
                let closest = pts[0], minDx = Infinity;
                pts.forEach(p => {
                    const dx = Math.abs(pxFn(p.date.getTime()) - cx);
                    if (dx < minDx) { minDx = dx; closest = p; }
                });
                const dateLbl = closest.date.toISOString().split('T')[0];
                const valLbl = fmtVal(closest.value);
                let btcLbl = '';
                if (canvas._btcPoints && canvas._btcPoints.length) {
                    const mxcT = tsAtX(cx);
                    let closestB = canvas._btcPoints[0], minBtcDx = Infinity;
                    canvas._btcPoints.forEach(p => {
                        const dx = Math.abs(p.ts.getTime() - mxcT);
                        if (dx < minBtcDx) { minBtcDx = dx; closestB = p; }
                    });
                    const bv = closestB.price;
                    btcLbl = `<br><span style="color:#f7931a">BTC: $${bv >= 1e3 ? (bv / 1e3).toFixed(1) + 'K' : bv.toFixed(0)}</span>`;
                }
                tooltip.innerHTML = `<b>${dateLbl}</b><br><span style="color:#5b9dff">${t('chartPortfolio')}: ${valLbl}</span>${btcLbl}`;
                tooltip.style.opacity = '1';
                tooltip.style.left = (clientX + 16) + 'px';
                tooltip.style.top = (clientY - 36) + 'px';
            }

            function hideTooltip() {
                tooltip.style.opacity = '0';
            }

            function drawSelection() {
                syncOverlaySize();
                const ctx = overlay.getContext('2d');
                ctx.clearRect(0, 0, overlay.width, overlay.height);
                if (!sel) return;

                const PAD_T = canvas._padT || 20;
                const PAD_B = canvas._padB || 48;
                const H = overlay.height;
                const x0 = Math.min(sel.x0, sel.x1);
                const x1 = Math.max(sel.x0, sel.x1);
                const w = x1 - x0;

                // shaded area
                ctx.fillStyle = 'rgba(61,126,255,0.12)';
                ctx.fillRect(x0, PAD_T, w, H - PAD_T - PAD_B);

                // border lines
                ctx.strokeStyle = '#3d7effaa';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 3]);
                ctx.beginPath(); ctx.moveTo(x0, PAD_T); ctx.lineTo(x0, H - PAD_B); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x1, PAD_T); ctx.lineTo(x1, H - PAD_B); ctx.stroke();
                ctx.setLineDash([]);

                // stats
                const ts0 = tsAtX(x0), ts1 = tsAtX(x1);
                const eq0 = closestEq(ts0), eq1 = closestEq(ts1);
                const btc0 = closestBtc(ts0), btc1 = closestBtc(ts1);
                const eqPct = eq0 && eq1 ? pct(eq0.value, eq1.value) : null;
                const btcPct = btc0 && btc1 ? pct(btc0.price, btc1.price) : null;

                const d0 = eq0 ? eq0.date.toISOString().split('T')[0] : '';
                const d1 = eq1 ? eq1.date.toISOString().split('T')[0] : '';

                let html = `<span style="color:#9da5b4;font-size:0.75rem">${d0} → ${d1}</span><br>`;
                if (eqPct !== null) html += `<span style="color:#5b9dff">${t('chartPortfolio')}</span>: ${fmtPct(eqPct)}`;
                if (eq0 && eq1) html += ` <span style="color:#555">(${fmtVal(eq0.value)} → ${fmtVal(eq1.value)})</span>`;
                if (btcPct !== null) html += `<br><span style="color:#f7931a">${t('chartBtc')}</span>: ${fmtPct(btcPct)}`;
                if (btc0 && btc1) {
                    const bfmt = v => v >= 1e3 ? '$' + (v/1e3).toFixed(1) + 'K' : '$' + v.toFixed(0);
                    html += ` <span style="color:#555">(${bfmt(btc0.price)} → ${bfmt(btc1.price)})</span>`;
                }

                selStats.innerHTML = html;
                selStats.style.display = 'block';

                // position stats box: right of selection if room, else left
                const wrap = canvas.parentElement;
                const wrapW = wrap.clientWidth;
                const cssX1 = x1 * (wrapW / canvas.width);
                const cssX0 = x0 * (wrapW / canvas.width);
                const boxW = 320;
                let statLeft = cssX1 + 8;
                if (statLeft + boxW > wrapW - 4) statLeft = cssX0 - boxW - 8;
                statLeft = Math.max(4, statLeft);
                selStats.style.left = statLeft + 'px';
                selStats.style.top = '24px';
            }

            function clearSelection() {
                sel = null;
                const ctx = overlay.getContext('2d');
                syncOverlaySize();
                ctx.clearRect(0, 0, overlay.width, overlay.height);
                selStats.style.display = 'none';
            }

            // sync overlay size when chart rebuilds
            window._postBuildEquityChart = function() {
                syncOverlaySize();
                if (sel) drawSelection();
            };

            // ── Desktop mouse events ──────────────────────────────────────
            canvas.addEventListener('mousedown', e => {
                if (e.button !== 0) return;
                e.preventDefault();
                dragging = true;
                dragStart = canvasX(e);
                sel = { x0: dragStart, x1: dragStart };
                hideTooltip();
            });

            window.addEventListener('mousemove', e => {
                if (!dragging) return;
                sel.x1 = canvasX(e);
                drawSelection();
            });

            window.addEventListener('mouseup', e => {
                if (!dragging) return;
                dragging = false;
                sel.x1 = canvasX(e);
                if (Math.abs(sel.x1 - sel.x0) < 4) { clearSelection(); return; }
                drawSelection();
            });

            canvas.addEventListener('mousemove', e => {
                if (dragging || sel) return;
                showTooltipAt(canvasX(e), e.clientX, e.clientY);
            });

            canvas.addEventListener('mouseleave', () => { if (!dragging) hideTooltip(); });

            // If the page/layout moves, hide stale fixed-position tooltip.
            window.addEventListener('scroll', hideTooltip, true);
            window.addEventListener('wheel', hideTooltip, { passive: true });
            window.addEventListener('resize', hideTooltip);

            canvas.addEventListener('mousemove', e => {
                canvas.style.cursor = dragging ? 'crosshair' : 'crosshair';
            });

            // ── Touch events (mobile) ─────────────────────────────────────
            canvas.addEventListener('touchstart', e => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                touchOrigin = { cx: touchCanvasX(touch), clientX: touch.clientX, clientY: touch.clientY };
                touchSelDragging = false;
                hideTooltip();
                touchTimer = setTimeout(() => {
                    // Enter selection drag mode after long press
                    touchSelDragging = true;
                    dragStart = touchOrigin.cx;
                    sel = { x0: dragStart, x1: dragStart };
                    if (navigator.vibrate) navigator.vibrate(30);
                    drawSelection();
                }, 500);
            }, { passive: false });

            canvas.addEventListener('touchmove', e => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const cx = touchCanvasX(touch);
                // If finger moves significantly before long-press fires, cancel it
                if (!touchSelDragging && touchOrigin && Math.abs(cx - touchOrigin.cx) > 10) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                if (touchSelDragging) {
                    sel.x1 = cx;
                    drawSelection();
                } else {
                    showTooltipAt(cx, touch.clientX, touch.clientY);
                }
            }, { passive: false });

            canvas.addEventListener('touchend', e => {
                e.preventDefault();
                clearTimeout(touchTimer);
                touchTimer = null;
                if (!touchSelDragging) {
                    // Simple tap: show tooltip at the tapped position
                    if (sel) { clearSelection(); }
                    else if (touchOrigin) { showTooltipAt(touchOrigin.cx, touchOrigin.clientX, touchOrigin.clientY); }
                } else {
                    touchSelDragging = false;
                    if (sel && Math.abs(sel.x1 - sel.x0) < 4) clearSelection();
                    else if (sel) drawSelection();
                }
                touchOrigin = null;
            }, { passive: false });

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && sel) clearSelection();
            });
        })();
