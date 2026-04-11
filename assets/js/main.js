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
            if (botSpecs) {
                const content = t('botSpecsContent');
                botSpecs.value = Array.isArray(content) ? content.join('\n\n') : content;
            }
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
                metricMaxDrawdown:    t('help_metricMaxDrawdown'),
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

        // ── Performance caches ───────────────────────────────────────────────
        let _cachedAllPoints = null;
        let _cachedAllTradeMarkers = null;
        let _cachedEquityDataKey = null;
        let _allBtcSorted = [];   // all BTC candles {ts:Date,price:number}, sorted, built once at load
        let _btcForEquity = [];   // 1h-stride subset of _allBtcSorted, built once at load
        let _rollingCache  = {};  // memoize calculatePeriodicAnalysis

        // Binary-search: first index in arr where arr[i].ts.getTime() >= targetMs
        function _bisectTs(arr, targetMs) {
            let lo = 0, hi = arr.length;
            while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].ts.getTime() < targetMs) lo = mid + 1; else hi = mid; }
            return lo;
        }

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

        // ── Date picker popup ────────────────────────────────────────
        (function () {
            // Create popup element once
            const popup = document.createElement('div');
            popup.className = 'date-picker-popup hidden';
            popup.id = 'datePicker';
            document.body.appendChild(popup);

            let currentTarget = null; // 'start' | 'end'
            let viewYear, viewMonth;

            const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];
            const MONTH_NAMES = ['January','February','March','April','May','June',
                                 'July','August','September','October','November','December'];

            function clampDate(d) {
                const t = d.getTime();
                if (t < minDate.getTime()) return new Date(minDate);
                if (t > maxDate.getTime()) return new Date(maxDate);
                return d;
            }

            function buildCalendar() {
                const selected = currentTarget === 'start' ? startDate : endDate;
                const otherDate = currentTarget === 'start' ? endDate : startDate;
                const low  = currentTarget === 'start' ? minDate : new Date(startDate.getTime() + 86400000);
                const high = currentTarget === 'start' ? new Date(endDate.getTime() - 86400000) : maxDate;

                const firstDay = new Date(viewYear, viewMonth, 1).getDay();
                const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
                const today = new Date();

                let html = `<div class="dp-header">
                    <button class="dp-nav" id="dpPrev">&#8249;</button>
                    <span class="dp-month-year">${MONTH_NAMES[viewMonth]} ${viewYear}</span>
                    <button class="dp-nav" id="dpNext">&#8250;</button>
                </div><div class="dp-grid">`;

                DAY_NAMES.forEach(d => { html += `<div class="dp-day-name">${d}</div>`; });
                for (let i = 0; i < firstDay; i++) html += `<div class="dp-day empty"></div>`;

                for (let day = 1; day <= daysInMonth; day++) {
                    const d = new Date(viewYear, viewMonth, day);
                    const isSelected = d.toDateString() === selected.toDateString();
                    const isToday    = d.toDateString() === today.toDateString();
                    const outOfRange = d < low || d > high;
                    let cls = 'dp-day';
                    if (isSelected)  cls += ' selected';
                    else if (isToday) cls += ' today';
                    if (outOfRange)  cls += ' out-of-range';
                    html += `<div class="${cls}" data-day="${day}">${day}</div>`;
                }
                html += `</div>`;
                popup.innerHTML = html;

                document.getElementById('dpPrev').addEventListener('click', e => {
                    e.stopPropagation();
                    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
                    buildCalendar();
                });
                document.getElementById('dpNext').addEventListener('click', e => {
                    e.stopPropagation();
                    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
                    buildCalendar();
                });

                popup.querySelectorAll('.dp-day[data-day]').forEach(el => {
                    el.addEventListener('click', e => {
                        e.stopPropagation();
                        const chosen = new Date(viewYear, viewMonth, parseInt(el.dataset.day));
                        const minMidnight = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                        const dayOffset = Math.round((chosen - minMidnight) / 86400000);
                        if (currentTarget === 'start') {
                            document.getElementById('startSlider').value = dayOffset;
                            updateStartDate({ target: document.getElementById('startSlider') });
                        } else {
                            document.getElementById('endSlider').value = dayOffset;
                            updateEndDate({ target: document.getElementById('endSlider') });
                        }
                        closePopup();
                    });
                });
            }

            let _anchor = null;

            function repositionPopup() {
                if (!_anchor || popup.classList.contains('hidden')) return;
                const rect = _anchor.getBoundingClientRect();
                let top  = rect.bottom + 6;
                let left = rect.left;
                const popW = popup.offsetWidth  || 290;
                const popH = popup.offsetHeight || 320;
                // keep inside viewport horizontally
                if (left + popW > window.innerWidth)  left = window.innerWidth  - popW - 4;
                if (left < 4) left = 4;
                // prefer below; flip above only if no room below AND room above
                if (top + popH > window.innerHeight && rect.top - popH - 6 > 0) {
                    top = rect.top - popH - 6;
                }
                popup.style.top  = top  + 'px';
                popup.style.left = left + 'px';
            }

            function openPopup(target, anchorEl) {
                currentTarget = target;
                _anchor = anchorEl;
                const ref = currentTarget === 'start' ? startDate : endDate;
                viewYear  = ref.getFullYear();
                viewMonth = ref.getMonth();
                buildCalendar();
                popup.classList.remove('hidden');
                repositionPopup();
                window.addEventListener('scroll', repositionPopup, { passive: true, capture: true });
                window.addEventListener('resize', repositionPopup, { passive: true });
            }

            function closePopup() {
                popup.classList.add('hidden');
                currentTarget = null;
                _anchor = null;
                window.removeEventListener('scroll', repositionPopup, { capture: true });
                window.removeEventListener('resize', repositionPopup);
            }

            // Attach click to date labels once they exist (they're rendered dynamically)
            function attachLabelListeners() {
                const sl = document.getElementById('startDateLabel');
                const el = document.getElementById('endDateLabel');
                if (!sl || !el) return;
                sl.classList.add('date-clickable');
                el.classList.add('date-clickable');
                sl.addEventListener('click', e => { e.stopPropagation(); if (minDate) openPopup('start', sl); });
                el.addEventListener('click', e => { e.stopPropagation(); if (minDate) openPopup('end', el); });
            }
            // Labels are present in HTML, so attach immediately
            attachLabelListeners();

            // Close on outside click
            document.addEventListener('click', e => {
                if (!popup.classList.contains('hidden') && !popup.contains(e.target)) closePopup();
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') closePopup();
            });
        })();
        // ── End date picker ──────────────────────────────────────────



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
        
        // Window resize handler to recalculate heights (debounced)
        let _resizeTimer = null;
        window.addEventListener('resize', function() {
            setTimeout(matchHistoryHeight, 100);
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(buildEquityChart, 150);
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

                // Build global BTC lookup arrays once (reused by chart, tooltips, button ROI)
                _allBtcSorted = priceData
                    .filter(r => r.CANDLE_START && typeof r.CLOSE_PRICE === 'number')
                    .map(r => ({ ts: new Date(r.CANDLE_START), price: r.CLOSE_PRICE }))
                    .filter(r => !isNaN(r.ts.getTime())); // priceData already sorted
                const _H1MS_INIT = 3600000;
                _btcForEquity = [];
                let _lastBtcTs0 = -Infinity;
                for (const c of _allBtcSorted) {
                    if (c.ts.getTime() - _lastBtcTs0 >= _H1MS_INIT) {
                        _btcForEquity.push(c);
                        _lastBtcTs0 = c.ts.getTime();
                    }
                }

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

            const fiveYearsAgo = new Date(maxDate.getFullYear() - 5, maxDate.getMonth(), maxDate.getDate());
            const defaultStart = fiveYearsAgo > minDate ? fiveYearsAgo : minDate;
            const defaultStartDay = Math.ceil((defaultStart - minDate) / (1000 * 60 * 60 * 24));
            startDate = new Date(minDate.getTime() + defaultStartDay * 24 * 60 * 60 * 1000);

            document.getElementById('startSlider').value = defaultStartDay;
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

        function formatRoi(value) {
            if (value === 'N/A' || value === '-' || value === undefined || value === null) return value;
            const n = typeof value === 'number' ? value : parseFloat(value);
            if (!Number.isFinite(n)) return value;
            const rounded = Math.round(n);
            const abs = Math.abs(rounded);
            const numStr = String(abs);
            const str = n < 0 ? '-' + numStr + '%' : numStr + '%';
            const color = n >= 0 ? '#00e676' : '#ff4757';
            return `<span style="color:${color}">${str}</span>`;
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

                    // Calculate final ROI with leverage applied
                    let roiMoney = 1;
                    for (const row of filtered) {
                        roiMoney *= (1 + (row.PROFIT_PERCENT * leverage) / 100);
                    }
                    const finalRoi = Math.round((roiMoney - 1) * 10000) / 100;

                    // Buy & Hold calculation (% ROI, no leverage)
                    let buyAndHold = 'N/A';
                    if (priceData.length > 0 && startDate && endDate) {
                        const startPrice = findClosestPrice(startDate);
                        const endPrice = findClosestPrice(endDate);
                        
                        if (startPrice && endPrice && startPrice > 0) {
                            buyAndHold = Math.round((endPrice / startPrice - 1) * 10000) / 100;
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
                    let ddMoney = 1;
                    let ddPeak = 1;
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
                            { label: t('avgRolling'), value: formatRoi(periodicResults[index].avg), helpKey: 'metricRollingAvg' },
                            { label: t('minRolling'), value: formatRoi(periodicResults[index].min), helpKey: 'metricRollingMin' },
                            { label: t('maxRolling'), value: formatRoi(periodicResults[index].max), helpKey: 'metricRollingMax' }
                        ];
                    } else {
                        rollingMetrics = [
                            { label: t('avgRolling'), value: 'N/A', helpKey: 'metricRollingAvg' },
                            { label: t('minRolling'), value: 'N/A', helpKey: 'metricRollingMin' },
                            { label: t('maxRolling'), value: 'N/A', helpKey: 'metricRollingMax' }
                        ];
                    }

                    // Main metrics
                    const mainMetrics = [
                        { label: t('successfulPos'), subLabel: t('avgSub', combinedSuccessfulAvg), value: formatWholeNumber(totalSuccessful), helpKey: 'metricSuccessful', sectionBreak: true },
                        { label: t('losingPos'), subLabel: t('avgMinSub', combinedLosingAvg, minLoss), value: formatWholeNumber(totalLosing), helpKey: 'metricLosing' },
                        { label: t('maxDrawdown'), value: `<span style="color:#ff4757">-${Math.abs(maxDrawdown)}%</span>`, helpKey: 'metricMaxDrawdown' },
                        { label: t('buyHold'), value: formatRoi(buyAndHold), helpKey: 'metricBuyHold' },
                        { label: t('finalValue'), value: formatRoi(finalRoi), helpKey: 'metricFinalValue' }
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
            if (_allBtcSorted.length === 0) return null;
            const target = targetDate.getTime();
            let lo = _bisectTs(_allBtcSorted, target);
            if (lo >= _allBtcSorted.length) lo = _allBtcSorted.length - 1;
            if (lo > 0 && Math.abs(_allBtcSorted[lo - 1].ts.getTime() - target) < Math.abs(_allBtcSorted[lo].ts.getTime() - target))
                return _allBtcSorted[lo - 1].price;
            return _allBtcSorted[lo].price;
        }

        function calculatePeriodicAnalysis(table, tableIndex) {
            if (priceData.length === 0 || !startDate || !endDate) return;

            // Memoize: skip recomputation if inputs unchanged
            const cacheKey = `${tableIndex}|${startDate.getTime()}|${endDate.getTime()}|${iterPeriod}|${leverage}`;
            if (_rollingCache[cacheKey]) {
                periodicResults[tableIndex] = _rollingCache[cacheKey];
                return;
            }

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
                let moneyIter = 1;
                const endWindow = new Date(current);
                endWindow.setDate(endWindow.getDate() + iterPeriod);
                
                for (const row of table.data) {
                    // TRADE_START is already a Date object (parsed in parseCSV)
                    if (row.TRADE_START >= current && row.TRADE_START < endWindow) {
                        if (!isNaN(row.PROFIT_PERCENT)) {
                            moneyIter *= (1 + (row.PROFIT_PERCENT * leverage) / 100);
                        }
                    }
                }

                results.push(Math.round((moneyIter - 1) * 10000) / 100);
                current.setDate(current.getDate() + 1);
            }
            
            if (!periodicResults[tableIndex]) {
                periodicResults[tableIndex] = {};
            }
            
            periodicResults[tableIndex].avg = results.length > 0 ? 
                Math.round(results.reduce((a, b) => a + b, 0) / results.length * 100) / 100 : undefined;
            periodicResults[tableIndex].min = results.length > 0 ? Math.min(...results) : undefined;
            periodicResults[tableIndex].max = results.length > 0 ? Math.max(...results) : undefined;
            _rollingCache[cacheKey] = periodicResults[tableIndex];
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
                csvTableHead.innerHTML = '<tr>' + headers.map(header => {
                    const label = headerLabels[header] || header;
                    const extra = header === 'TRADE_TYPE' ? ` data-mobile-label="${t('colPositionMobile')}"` : '';
                    return `<th${extra}>${label}</th>`;
                }).join('') + '</tr>';

                csvTableBody.innerHTML = '';
                const sortedData = [...tradeData].sort((a, b) => {
                    const dateA = new Date(a.TRADE_START);
                    const dateB = new Date(b.TRADE_START);
                    return dateB - dateA;
                });
                
                sortedData.forEach(row => {
                    const tr = document.createElement('tr');
                    // Pre-compute ROI label for mobile stacked layout
                    const rawProfit = row['PROFIT_PERCENT'];
                    let roiStr = '-';
                    let roiClass = '';
                    if (typeof rawProfit === 'number' && !isNaN(rawProfit) && isFinite(rawProfit)) {
                        roiStr = (rawProfit * leverage).toFixed(2) + '%';
                        roiClass = roiStr.includes('-') ? 'roi-negative' : (parseFloat(roiStr) > 0 ? 'roi-positive' : '');
                    }
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
                            td.setAttribute('data-roi', roiStr);
                            if (roiClass) td.classList.add(roiClass);
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

            // Sort trades by open date
            const sortedTrades = tradeTables[0].data
                .filter(row =>
                    row.TRADE_START instanceof Date && !isNaN(row.TRADE_START.getTime()) &&
                    row.TRADE_END   instanceof Date && !isNaN(row.TRADE_END.getTime()) &&
                    typeof row.START_PRICE === 'number' &&
                    typeof row.PROFIT_PERCENT === 'number')
                .sort((a, b) => a.TRADE_START - b.TRADE_START);

            // Stride for intra-trade BTC interpolation based on selected period
            const H1MS = 3600000;
            // equityStrideMs: FIXED at 1h so allPoints is identical regardless of
            // which period button is active. This makes button ROI and the
            // selection-overlay ROI always consistent with each other.
            // displayStrideMs: only used for the BTC orange line drawing (performance).
            const displayStrideMs =
                equityPeriodMonths === 0                               ? 96 * H1MS : // All
                equityPeriodMonths === 60                              ? 72 * H1MS : // 5Y
                equityPeriodMonths === 36                              ? 48 * H1MS : // 3Y
                equityPeriodMonths === 12                              ?  4 * H1MS : // 1Y
                equityPeriodMonths === 6                               ?  2 * H1MS : // 3M
                equityPeriodMonths === 3                               ?  1 * H1MS : // 1M
                H1MS; // Default 1h

            // ── Build / restore cached equity data ──────────────────────────────
            // allPoints is identical for the same trades+prices+leverage regardless
            // of which period button is active, so cache and skip on period switches.
            const _eqDataKey = `${leverage}|${tradeTables[0].data.length}|${priceData.length}`;
            let allPoints, allTradeMarkers;

            if (_cachedEquityDataKey !== _eqDataKey) {
                // Use global _btcForEquity (1h-stride, built at load time) — no re-scanning
                let runningEquity = 1;
                const allPointsRaw = minDate ? [{ date: new Date(minDate), value: 1 }] : [];
                allTradeMarkers = [];

                for (const trade of sortedTrades) {
                    const equityAtEntry = runningEquity;
                    allTradeMarkers.push({ date: new Date(trade.TRADE_START), value: equityAtEntry });

                    const isLong = trade.TRADE_TYPE === 'buy';
                    for (const c of _btcForEquity) {
                        if (c.ts <= trade.TRADE_START) continue;
                        if (c.ts >= trade.TRADE_END) break;
                        const pnlFactor = isLong
                            ? (c.price - trade.START_PRICE) / trade.START_PRICE * leverage
                            : (trade.START_PRICE - c.price) / trade.START_PRICE * leverage;
                        allPointsRaw.push({ date: c.ts, value: equityAtEntry * (1 + pnlFactor) });
                    }

                    runningEquity = equityAtEntry * (1 + (trade.PROFIT_PERCENT * leverage) / 100);
                    allPointsRaw.push({ date: new Date(trade.TRADE_END), value: runningEquity });
                    allTradeMarkers.push({ date: new Date(trade.TRADE_END), value: runningEquity });
                }

                allPointsRaw.sort((a, b) => a.date - b.date);
                allPoints = allPointsRaw.filter((p, i, arr) =>
                    i === arr.length - 1 || p.date.getTime() !== arr[i + 1].date.getTime());

                _cachedAllPoints = allPoints;
                _cachedAllTradeMarkers = allTradeMarkers;
                _cachedEquityDataKey = _eqDataKey;
            } else {
                allPoints = _cachedAllPoints;
                allTradeMarkers = _cachedAllTradeMarkers;
            }

            if (allPoints.length === 0) return;

            let points = allPoints;
            if (equityPeriodMonths > 0) {
                const cutoff = new Date(allPoints[allPoints.length - 1].date);
                cutoff.setMonth(cutoff.getMonth() - equityPeriodMonths);
                points = allPoints.filter(p => p.date >= cutoff);
                if (points.length === 0) points = allPoints;
            }

            // Trade markers visible in this period
            const periodCutoff = points[0].date;
            const periodTradeMarkers = allTradeMarkers.filter(m => m.date >= periodCutoff);

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

            // ── Build BTC points (downsampled for display only) for BTC line drawing ──
            // Binary-search _allBtcSorted for the visible window instead of re-scanning all rows
            const _iStart = _bisectTs(_allBtcSorted, tMin);
            let   _iEnd   = _bisectTs(_allBtcSorted, tMax);
            if (_iEnd < _allBtcSorted.length && _allBtcSorted[_iEnd].ts.getTime() <= tMax) _iEnd++;
            const _btcAllRaw = _allBtcSorted.slice(_iStart, _iEnd);
            const btcPointsRaw = [];
            let _lastBtcRawTs = -Infinity;
            for (const c of _btcAllRaw) {
                if (c.ts.getTime() - _lastBtcRawTs >= displayStrideMs) {
                    btcPointsRaw.push(c);
                    _lastBtcRawTs = c.ts.getTime();
                }
            }

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

            // ── Left grid lines + portfolio % labels ──
            const loPct = (loR - 1) * 100;
            const hiPct = (hiR - 1) * 100;
            const pctSpan = hiPct - loPct || 1;
            const rawPctStep = pctSpan / 6;
            const pctMag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawPctStep) || 1)));
            const pctStep = [1, 2, 2.5, 5, 10].map(f => f * pctMag).find(s => pctSpan / s <= 8) || pctMag * 10;
            const eqPctTicks = [];
            for (let v = Math.ceil(loPct / pctStep) * pctStep; v <= hiPct + 1e-9; v += pctStep)
                eqPctTicks.push(Math.round(v * 1e9) / 1e9);
            ctx.lineWidth = 1;
            eqPctTicks.forEach(pct => {
                const r = 1 + pct / 100;
                const gy = pyFn(r);
                if (gy < PAD_T || gy > H - PAD_B) return;
                ctx.strokeStyle = '#2a2f3a';
                ctx.beginPath(); ctx.moveTo(PAD_L, gy); ctx.lineTo(W - PAD_R, gy); ctx.stroke();
                ctx.fillStyle = '#9da5b4';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'right';
                const lbl = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
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

            // Downsample equity points for display (same stride as BTC orange line)
            // Full 'points' array is kept for hover/tooltip interaction.
            function downsampleForDisplay(pts, strideMs) {
                if (pts.length === 0) return pts;
                const result = [pts[0]];
                let lastTs = pts[0].date.getTime();
                for (let i = 1; i < pts.length - 1; i++) {
                    if (pts[i].date.getTime() - lastTs >= strideMs) {
                        result.push(pts[i]);
                        lastTs = pts[i].date.getTime();
                    }
                }
                result.push(pts[pts.length - 1]); // always include last point
                return result;
            }
            const displayPoints = downsampleForDisplay(points, displayStrideMs);

            // Smooth equity values for visual rendering only (trade markers stay exact)
            function movingAvg(pts, win) {
                if (win <= 1 || pts.length < win) return pts;
                const half = Math.floor(win / 2);
                return pts.map((p, i) => {
                    const s = Math.max(0, i - half), e = Math.min(pts.length - 1, i + half);
                    let sum = 0, cnt = 0;
                    for (let j = s; j <= e; j++) { sum += pts[j].value; cnt++; }
                    return { date: p.date, value: sum / cnt };
                });
            }
            const smoothWin =
                (equityPeriodMonths === 0 || equityPeriodMonths >= 36) ? 3 :
                equityPeriodMonths === 12 ? 5 : 9;
            const drawPoints = movingAvg(displayPoints, smoothWin);

            // Fill under line
            ctx.beginPath();
            ctx.moveTo(pxFn(drawPoints[0].date.getTime()), pyFn(drawPoints[0].value / eqBase));
            drawPoints.forEach(p => ctx.lineTo(pxFn(p.date.getTime()), pyFn(p.value / eqBase)));
            ctx.lineTo(pxFn(drawPoints[drawPoints.length - 1].date.getTime()), H - PAD_B);
            ctx.lineTo(pxFn(drawPoints[0].date.getTime()), H - PAD_B);
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
            drawPoints.forEach((p, i) => {
                const xp = pxFn(p.date.getTime()), yp = pyFn(p.value / eqBase);
                i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
            });
            ctx.stroke();

            // Trade entry/exit dots only
            periodTradeMarkers.forEach(m => {
                const xm = pxFn(m.date.getTime());
                const ym = pyFn(m.value / eqBase);
                ctx.beginPath();
                ctx.arc(xm, ym, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#5b9dff';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(xm, ym, 4, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

            canvas._eqPoints = points;
            canvas._eqPx = pxFn;
            canvas._eqPy = pyFn;
            canvas._eqBase = eqBase;
            canvas._eqTradeMarkers = periodTradeMarkers;

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
            if (sub) sub.textContent = '';

            // notify overlay
            if (typeof window._postBuildEquityChart === 'function') window._postBuildEquityChart();

            // ── Per-period ROI labels on buttons ──
            (function() {
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
                        // Use lastPt.date (same reference as the chart) not maxDate,
                        // so the cutoff is identical to what the chart draws from.
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

                    // Binary-search _allBtcSorted for [startTs, endTs] window
                    const startTs = months === 0 ? allPoints[0].date.getTime() : cutoff.getTime();
                    const endTs   = lastPt.date.getTime();
                    const bStart  = _bisectTs(_allBtcSorted, startTs);
                    let   bEnd    = _bisectTs(_allBtcSorted, endTs);
                    if (bEnd < _allBtcSorted.length && _allBtcSorted[bEnd].ts.getTime() <= endTs) bEnd++;

                    if (bEnd - bStart >= 2) {
                        const roi = (_allBtcSorted[bEnd - 1].price / _allBtcSorted[bStart].price - 1) * 100;
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
                if (window._clearEquitySelection) window._clearEquitySelection();
                if (window._hideEquityTooltip) window._hideEquityTooltip();
                buildEquityChart();
            });
        });

        // Hover tooltip + selection
        // Desktop: double-click to pin start, hover to preview end, click to confirm; hover for price tooltip
        // Mobile: tap for price tooltip; double-tap + drag to select period
        (function () {
            const canvas = document.getElementById('equityChart');
            const overlay = document.getElementById('equityOverlay');
            const tooltip = document.getElementById('equityTooltip');
            const selStats = document.getElementById('equitySelStats');
            if (!canvas || !overlay || !tooltip || !selStats) return;

            let sel = null; // { x0, x1 } in canvas px, or null
            let selMode = false; // true when x0 is pinned, x1 tracks cursor/finger
            let dragStart = null;
            let hovCx = null; // crosshair x in canvas px, or null
            let pendingClickTimer = null;

            // touch state
            let touchSelDragging = false;
            let touchOrigin = null;
            let lastTouchPos = null; // last position seen in touchmove
            let lastTapTime = 0;
            let lastTapCx = null;

            function syncOverlaySize() {
                overlay.width = canvas.width;
                overlay.height = canvas.height;
            }

            function canvasX(e) {
                const r = canvas.getBoundingClientRect();
                return (e.clientX - r.left) * (canvas.width / r.width);
            }

            function canvasY(e) {
                const r = canvas.getBoundingClientRect();
                return (e.clientY - r.top) * (canvas.height / r.height);
            }

            function touchCanvasX(touch) {
                const r = canvas.getBoundingClientRect();
                return (touch.clientX - r.left) * (canvas.width / r.width);
            }

            function touchCanvasY(touch) {
                const r = canvas.getBoundingClientRect();
                return (touch.clientY - r.top) * (canvas.height / r.height);
            }

            function tsAtX(cx) {
                return canvas._tMin + ((cx - canvas._padL) / canvas._cW) * canvas._tRange;
            }

            // ── Graph area bounds helpers ──────────────────────────────
            function graphBounds() {
                const padL = canvas._padL || 56;
                const cW   = canvas._cW   || (canvas.width - 114);
                const padT = canvas._padT || 20;
                const padB = canvas._padB || 48;
                return { left: padL, right: padL + cW, top: padT, bottom: canvas.height - padB };
            }

            function clampToGraph(cx) {
                const b = graphBounds();
                return Math.max(b.left, Math.min(b.right, cx));
            }

            function inGraphArea(cx, cy) {
                const b = graphBounds();
                return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
            }

            // ── Edge-drag state ────────────────────────────────────────
            let edgeDrag = null; // null | 'left' | 'right'
            let _suppressNextClick = false;
            const EDGE_HIT = 10; // px — hit radius around each selection edge

            function nearEdge(cx) {
                if (!sel || selMode) return null;
                if (Math.abs(cx - sel.x0) <= EDGE_HIT) return 'left';
                if (Math.abs(cx - sel.x1) <= EDGE_HIT) return 'right';
                return null;
            }

            function closestEq(ts) {
                const pts = canvas._eqPoints;
                if (!pts || pts.length === 0) return null;
                let lo = 0, hi = pts.length - 1;
                while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].date.getTime() < ts) lo = mid + 1; else hi = mid; }
                if (lo > 0 && Math.abs(pts[lo - 1].date.getTime() - ts) < Math.abs(pts[lo].date.getTime() - ts)) return pts[lo - 1];
                return pts[lo];
            }

            function closestBtc(ts) {
                const pts = canvas._btcPoints;
                if (!pts || pts.length === 0) return null;
                let lo = 0, hi = pts.length - 1;
                while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].ts.getTime() < ts) lo = mid + 1; else hi = mid; }
                if (lo > 0 && Math.abs(pts[lo - 1].ts.getTime() - ts) < Math.abs(pts[lo].ts.getTime() - ts)) return pts[lo - 1];
                return pts[lo];
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
                const ts = tsAtX(cx);
                const closest = closestEq(ts); // binary search by timestamp
                if (!closest) return;
                const dateLbl = closest.date.toISOString().split('T')[0];
                const eqPctVal = (closest.value / canvas._eqBase - 1) * 100;
                const eqPctColor = eqPctVal >= 0 ? '#00e676' : '#ff4757';
                const eqPctLbl = (eqPctVal >= 0 ? '+' : '') + eqPctVal.toFixed(2) + '%';
                let btcLbl = '';
                if (canvas._btcPoints && canvas._btcPoints.length) {
                    const closestB = closestBtc(ts); // binary search
                    if (closestB) {
                        const bv = closestB.price;
                        btcLbl = `<br><span style="color:#f7931a">BTC: $${bv >= 1e3 ? (bv / 1e3).toFixed(1) + 'K' : bv.toFixed(0)}</span>`;
                    }
                }
                tooltip.innerHTML = `<b>${dateLbl}</b><br><span style="color:#5b9dff">${t('chartPortfolio')}: <b style="color:${eqPctColor}">${eqPctLbl}</b></span>${btcLbl}`;
                tooltip.style.opacity = '1';

                // Anchor tooltip centered on the end of the vertical crosshair line.
                // Cursor in bottom half → box centered on the TOP end of the line.
                // Cursor in top half   → box centered on the BOTTOM end of the line.
                const r   = canvas.getBoundingClientRect();
                const cssScale = r.width / canvas.width;
                const padT = canvas._padT || 20;
                const padB = canvas._padB || 48;
                const chartTopY    = r.top  + padT * cssScale;
                const chartBottomY = r.bottom - padB * cssScale;
                const chartMidY    = (chartTopY + chartBottomY) / 2;

                const crosshairClientX = r.left + cx * cssScale;

                const ttW = tooltip.offsetWidth  || 160;
                const ttH = tooltip.offsetHeight || 60;
                const margin = 4;

                // Horizontal: centered on the crosshair line, clamped to viewport
                let left = crosshairClientX - ttW / 2;
                left = Math.max(margin, Math.min(left, window.innerWidth - ttW - margin));

                // Vertical: centered on whichever end of the line is farther from cursor
                let top;
                if (clientY >= chartMidY) {
                    // Cursor in bottom half → center box on TOP end of line
                    top = chartTopY - ttH / 2;
                } else {
                    // Cursor in top half → center box on BOTTOM end of line
                    top = chartBottomY - ttH / 2;
                }
                top = Math.max(margin, Math.min(top, window.innerHeight - ttH - margin));

                tooltip.style.left = left + 'px';
                tooltip.style.top  = top  + 'px';
                hovCx = cx;
                redrawOverlay();
            }

            function hideTooltip() {
                tooltip.style.opacity = '0';
                hovCx = null;
                redrawOverlay();
            }

            function redrawOverlay() {
                syncOverlaySize();
                const ctx = overlay.getContext('2d');
                ctx.clearRect(0, 0, overlay.width, overlay.height);
                const PAD_T = canvas._padT || 20;
                const PAD_B = canvas._padB || 48;
                const H = overlay.height;

                // Vertical crosshair line (only when no selection active)
                if (hovCx !== null && !sel) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(180,200,255,0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 3]);
                    ctx.beginPath();
                    ctx.moveTo(hovCx, PAD_T);
                    ctx.lineTo(hovCx, H - PAD_B);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }

                if (!sel) return;

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
                if (btcPct !== null) html += `<br><span style="color:#f7931a">${t('chartBtc')}</span>: ${fmtPct(btcPct)}`;

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

            function drawSelection() { redrawOverlay(); }

            function clearSelection() {
                sel = null;
                selStats.style.display = 'none';
                redrawOverlay();
            }

            // sync overlay size when chart rebuilds
            window._postBuildEquityChart = function() {
                syncOverlaySize();
                if (sel) drawSelection();
            };

            // ── Desktop mouse events ──────────────────────────────────────
            // Double-click  → start new selection (or clear existing)
            // Mousemove     → preview x1 during selMode; edge-drag if active; tooltip otherwise
            // Mousedown     → begin edge drag if near a confirmed selection edge
            // Mouseup       → finish edge drag
            // Click         → confirm end of selection (selMode); or clear confirmed selection
            canvas.addEventListener('dblclick', e => {
                e.preventDefault();
                const cx = canvasX(e);
                const cy = canvasY(e);
                if (!inGraphArea(cx, cy)) return; // ignore axis/padding area
                if (pendingClickTimer) { clearTimeout(pendingClickTimer); pendingClickTimer = null; }
                if (selMode || sel) { selMode = false; clearSelection(); return; }
                const gcx = clampToGraph(cx);
                sel = { x0: gcx, x1: gcx };
                selMode = true;
                hideTooltip();
                drawSelection();
            });

            canvas.addEventListener('mousedown', e => {
                if (e.button !== 0) return;
                const cx = canvasX(e);
                if (!sel || selMode) return;
                const edge = nearEdge(cx);
                if (edge) {
                    edgeDrag = edge;
                    _suppressNextClick = true;
                    e.preventDefault();
                }
            });

            window.addEventListener('mouseup', () => {
                if (edgeDrag) {
                    edgeDrag = null;
                    if (sel && Math.abs(sel.x1 - sel.x0) < 4) clearSelection();
                    else if (sel) drawSelection();
                }
            });

            canvas.addEventListener('mousemove', e => {
                const cx = canvasX(e);
                const cy = canvasY(e);
                const gcx = clampToGraph(cx);

                if (edgeDrag) {
                    if (edgeDrag === 'left')  sel.x0 = Math.min(gcx, sel.x1 - 4);
                    else                       sel.x1 = Math.max(gcx, sel.x0 + 4);
                    drawSelection();
                    canvas.style.cursor = 'ew-resize';
                    return;
                }

                if (selMode && sel) {
                    sel.x1 = gcx;
                    drawSelection();
                    canvas.style.cursor = 'crosshair';
                    return;
                }

                if (sel && !selMode) {
                    canvas.style.cursor = nearEdge(cx) ? 'ew-resize' : 'default';
                    return;
                }

                // No selection — show tooltip crosshair only within graph area
                if (inGraphArea(cx, cy)) {
                    showTooltipAt(gcx, e.clientX, e.clientY);
                    canvas.style.cursor = 'default';
                } else {
                    hideTooltip();
                    canvas.style.cursor = 'default';
                }
            });

            canvas.addEventListener('click', e => {
                if (_suppressNextClick) { _suppressNextClick = false; return; }
                if (pendingClickTimer) { clearTimeout(pendingClickTimer); pendingClickTimer = null; }
                const cx = canvasX(e);
                const cy = canvasY(e);
                if (!inGraphArea(cx, cy)) return;
                const gcx = clampToGraph(cx);
                if (selMode) {
                    pendingClickTimer = setTimeout(() => {
                        pendingClickTimer = null;
                        if (!selMode) return;
                        sel.x1 = gcx;
                        selMode = false;
                        // Normalize so x0 is always the left edge
                        if (sel.x0 > sel.x1) { const tmp = sel.x0; sel.x0 = sel.x1; sel.x1 = tmp; }
                        if (Math.abs(sel.x1 - sel.x0) < 4) clearSelection();
                        else drawSelection();
                    }, 250);
                } else if (sel) {
                    clearSelection();
                }
            });

            canvas.addEventListener('mouseleave', () => {
                if (!selMode && !edgeDrag) hideTooltip();
                if (!edgeDrag) canvas.style.cursor = 'default';
            });

            // If the page/layout moves, hide stale fixed-position tooltip.
            window.addEventListener('scroll', hideTooltip, true);
            window.addEventListener('wheel', hideTooltip, { passive: true });
            window.addEventListener('resize', hideTooltip);

            // ── Touch events (mobile) ─────────────────────────────────────
            // Single tap in graph area: show tooltip (or clear confirmed selection).
            // Double-tap in graph area: start selection drag.
            // Touch near confirmed selection edge: drag that edge.
            const DOUBLE_TAP_MS = 300;
            let touchEdgeDrag = null; // null | 'left' | 'right'

            canvas.addEventListener('touchstart', e => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const cx  = touchCanvasX(touch);
                const cy  = touchCanvasY(touch);
                const gcx = clampToGraph(cx);
                const now = Date.now();
                touchOrigin = { cx: gcx, clientX: touch.clientX, clientY: touch.clientY };
                lastTouchPos = null;

                // If there's a confirmed selection, check for edge drag first
                if (sel && !selMode) {
                    const edge = nearEdge(cx);
                    if (edge) {
                        touchEdgeDrag = edge;
                        if (navigator.vibrate) navigator.vibrate(20);
                        return;
                    }
                }

                // Ignore taps outside graph area
                if (!inGraphArea(cx, cy)) return;

                const timeSinceLast = now - lastTapTime;
                const distFromLast  = lastTapCx !== null ? Math.abs(gcx - lastTapCx) : Infinity;

                if (timeSinceLast < DOUBLE_TAP_MS && distFromLast < 40) {
                    // Double-tap: start selection drag (clears any existing selection)
                    clearSelection();
                    touchSelDragging = true;
                    sel = { x0: gcx, x1: gcx };
                    if (navigator.vibrate) navigator.vibrate(30);
                    hideTooltip();
                    drawSelection();
                    lastTapTime = 0;
                    lastTapCx = null;
                } else {
                    touchSelDragging = false;
                    touchEdgeDrag = null;
                    lastTapTime = now;
                    lastTapCx = gcx;
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', e => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const cx  = touchCanvasX(touch);
                const cy  = touchCanvasY(touch);
                const gcx = clampToGraph(cx);

                if (touchEdgeDrag) {
                    // Resize the dragged selection edge
                    if (touchEdgeDrag === 'left')  sel.x0 = Math.min(gcx, sel.x1 - 4);
                    else                            sel.x1 = Math.max(gcx, sel.x0 + 4);
                    drawSelection();
                    return;
                }

                if (touchSelDragging) {
                    sel.x1 = gcx;
                    drawSelection();
                } else {
                    if (inGraphArea(cx, cy)) {
                        lastTouchPos = { cx: gcx, clientX: touch.clientX, clientY: touch.clientY };
                        showTooltipAt(gcx, touch.clientX, touch.clientY);
                    }
                }
            }, { passive: false });

            canvas.addEventListener('touchend', e => {
                e.preventDefault();

                if (touchEdgeDrag) {
                    touchEdgeDrag = null;
                    if (sel && Math.abs(sel.x1 - sel.x0) < 4) clearSelection();
                    else if (sel) drawSelection();
                    return;
                }

                if (!touchSelDragging) {
                    const pos = lastTouchPos || touchOrigin;
                    if (sel && !selMode) {
                        // Tap on confirmed selection → clear it
                        clearSelection();
                    } else if (pos) {
                        showTooltipAt(pos.cx, pos.clientX, pos.clientY);
                    }
                } else {
                    touchSelDragging = false;
                    // Normalize so x0 is always the left edge
                    if (sel && sel.x0 > sel.x1) { const tmp = sel.x0; sel.x0 = sel.x1; sel.x1 = tmp; }
                    if (sel && Math.abs(sel.x1 - sel.x0) < 4) clearSelection();
                    else if (sel) drawSelection();
                }
                touchOrigin = null;
            }, { passive: false });

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') { selMode = false; clearSelection(); }
            });

            // Dismiss tooltip + crosshair when tapping/clicking outside the chart area
            const chartWrap = canvas.parentElement;
            document.addEventListener('click', e => {
                if (!chartWrap.contains(e.target)) {
                    if (selMode) { selMode = false; clearSelection(); }
                    hideTooltip();
                }
            });
            document.addEventListener('touchstart', e => {
                if (!chartWrap.contains(e.target)) hideTooltip();
            }, { passive: true });

            // Expose so period buttons can dismiss any open overlay
            window._clearEquitySelection = clearSelection;
            window._hideEquityTooltip = hideTooltip;
        })();
