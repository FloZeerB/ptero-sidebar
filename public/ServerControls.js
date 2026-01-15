(function() {
    'use strict';

    // Vérifier que nous sommes sur une page de serveur
    const serverUuid = window.location.pathname.split('/server/')[1]?. split('/')[0];
    if (!serverUuid) return;

    // États du serveur
    const STATUS_MAP = {
        'running': { label: 'En ligne', color: '#10b981', icon: '●' },
        'starting': { label: 'Démarrage... ', color: '#f59e0b', icon: '◐' },
        'stopping': { label: 'Arrêt...', color: '#f97316', icon: '◑' },
        'offline': { label: 'Hors ligne', color: '#ef4444', icon: '○' }
    };

    let currentStatus = 'offline';
    let isProcessing = false;

    // Créer le HTML des contrôles
    function createControlsHTML() {
        return `
            <div id="server-status-controls" style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div class="server-status" style="margin-bottom: 0.75rem; display: flex; align-items:  center; gap: 0.5rem;">
                    <span class="status-badge" id="status-badge" style="font-size: 1.2rem;"></span>
                    <span class="status-text" id="status-text" style="font-size: 0.875rem; color: #d1d5db;"></span>
                </div>
                
                <div class="server-controls" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="control-btn start-btn" data-action="start" style="
                        padding: 0.5rem;
                        background:  #10b981;
                        color: white;
                        border:  none;
                        border-radius: 0.375rem;
                        cursor: pointer;
                        font-size:  0.875rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        transition: all 0.2s;
                    ">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11. 596 8.697l-6.363 3.692c-. 54.313-1.233-.066-1.233-.697V4.308c0-.63. 692-1.01 1.233-.696l6.363 3.692a. 802.802 0 0 1 0 1.393z"/>
                        </svg>
                        Démarrer
                    </button>
                    
                    <button class="control-btn stop-btn" data-action="stop" style="
                        padding: 0.5rem;
                        background: #ef4444;
                        color:  white;
                        border: none;
                        border-radius:  0.375rem;
                        cursor: pointer;
                        font-size: 0.875rem;
                        display: flex;
                        align-items:  center;
                        justify-content: center;
                        gap:  0.5rem;
                        transition: all 0.2s;
                    ">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5 3. 5h6A1.5 1.5 0 0 1 12. 5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                        </svg>
                        Arrêter
                    </button>
                    
                    <button class="control-btn restart-btn" data-action="restart" style="
                        padding:  0.5rem;
                        background: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 0.375rem;
                        cursor: pointer;
                        font-size: 0.875rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        transition: all 0.2s;
                    ">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11.534 7h3.932a. 25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a. 25.25 0 0 1 . 192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2. 692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 . 534 9z"/>
                            <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a. 5.5 0 1 1-.771-. 636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182. 5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                        </svg>
                        Redémarrer
                    </button>
                </div>
            </div>
        `;
    }

    // Injecter les contrôles dans la sidebar
    function injectControls() {
        const sidebar = document.querySelector('#SubNavigation > div');
        if (!sidebar || document.querySelector('#server-status-controls')) return;

        sidebar.insertAdjacentHTML('afterbegin', createControlsHTML());
        attachEventListeners();
        updateStatusDisplay();
    }

    // Mettre à jour l'affichage du statut
    function updateStatusDisplay() {
        const badge = document.getElementById('status-badge');
        const text = document.getElementById('status-text');
        
        if (! badge || !text) return;

        const status = STATUS_MAP[currentStatus] || STATUS_MAP.offline;
        badge.textContent = status.icon;
        badge.style.color = status.color;
        text.textContent = status. label;
        text.style.color = status. color;

        updateButtonStates();
    }

    // Mettre à jour l'état des boutons
    function updateButtonStates() {
        const startBtn = document.querySelector('. start-btn');
        const stopBtn = document.querySelector('.stop-btn');
        const restartBtn = document.querySelector('.restart-btn');

        if (!startBtn || !stopBtn || ! restartBtn) return;

        // Désactiver tous si en cours de traitement
        if (isProcessing) {
            [startBtn, stopBtn, restartBtn].forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
            return;
        }

        // Logique selon le statut
        startBtn.disabled = currentStatus === 'running' || currentStatus === 'starting';
        stopBtn.disabled = currentStatus === 'offline' || currentStatus === 'stopping';
        restartBtn.disabled = currentStatus === 'offline';

        [startBtn, stopBtn, restartBtn].forEach(btn => {
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            btn. style.cursor = btn.disabled ?  'not-allowed' : 'pointer';
        });
    }

    // Envoyer une commande power
    async function sendPowerAction(action) {
        if (isProcessing) return;

        isProcessing = true;
        updateButtonStates();

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            
            const response = await fetch(`/api/client/servers/${serverUuid}/power`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({ signal: action })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response. status}`);
            }

            // Mettre à jour le statut immédiatement
            if (action === 'start') currentStatus = 'starting';
            else if (action === 'stop' || action === 'kill') currentStatus = 'stopping';
            else if (action === 'restart') currentStatus = 'stopping';

            updateStatusDisplay();

        } catch (error) {
            console.error('Erreur lors de l\'envoi de la commande:', error);
            alert('Erreur lors de l\'exécution de la commande.  Vérifiez vos permissions.');
        } finally {
            setTimeout(() => {
                isProcessing = false;
                updateButtonStates();
            }, 1000);
        }
    }

    // Attacher les événements aux boutons
    function attachEventListeners() {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                if (! btn.disabled) {
                    sendPowerAction(action);
                }
            });

            // Effet hover
            btn.addEventListener('mouseenter', (e) => {
                if (!e.currentTarget.disabled) {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'scale(0.98)';
                }
            });

            btn.addEventListener('mouseleave', (e) => {
                if (! e.currentTarget.disabled) {
                    e.currentTarget. style.opacity = '1';
                    e.currentTarget.style.transform = 'scale(1)';
                }
            });
        });
    }

    // Écouter le WebSocket pour le statut en temps réel
    function listenToWebSocket() {
        // Pterodactyl utilise un WebSocket global
        const checkWebSocket = setInterval(() => {
            if (window.PteroWebSocket) {
                clearInterval(checkWebSocket);
                
                window.PteroWebSocket.on('status', (status) => {
                    currentStatus = status;
                    updateStatusDisplay();
                });

                // Récupérer le statut initial
                if (window.PteroWebSocket.status) {
                    currentStatus = window.PteroWebSocket.status;
                    updateStatusDisplay();
                }
            }
        }, 500);

        // Timeout après 10 secondes
        setTimeout(() => clearInterval(checkWebSocket), 10000);
    }

    // Initialisation
    function init() {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Attendre que React soit monté
        setTimeout(() => {
            injectControls();
            listenToWebSocket();
        }, 1000);

        // Observer les changements de page (SPA)
        const observer = new MutationObserver(() => {
            if (! document.querySelector('#server-status-controls')) {
                injectControls();
            }
        });

        observer. observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();
})();
