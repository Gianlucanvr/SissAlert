window.onload = () => {
    const ctx = document.getElementById('chart').getContext('2d');
    const btnSegnala = document.getElementById('btnSegnala');
    const msg = document.getElementById('msg');
    let chart;

    function aggiornaGrafico() {
        fetch('/api/dati')
            .then(res => res.json())
            .then(json => {
                // Calcolo media
                const somma = json.data.reduce((a, b) => a + b, 0);
                const media = Math.max(Math.ceil(somma / json.data.length), 1); // almeno 1

                // Filtra le label ogni 3 ore
                const labels = json.labels.map((label, index) => {
                    return (index % 3 === 0) ? label : '';
                });

                if (!chart) {
                    chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Segnalazioni',
                                data: json.data,
                                borderColor: 'red',
                                backgroundColor: 'rgba(255,0,0,0.2)',
                                fill: true,
                                tension: 0.3,
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const index = context.dataIndex;
                                            const value = context.formattedValue;
                                            const oraCompleta = json.labels[index];
                                            const oggi = new Date();
                                            const dataStr = oggi.toLocaleDateString('it-IT');
                                            return ` ${value} segnalazioni alle ${oraCompleta} - ${dataStr}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1,
                                        callback: value => Number.isInteger(value) ? value : null
                                    },
                                    suggestedMax: media * 2
                                },
                                x: {
                                    ticks: {
                                        autoSkip: false,
                                        maxRotation: 0,
                                        minRotation: 0
                                    }
                                }
                            }
                        }
                    });
                } else {
                    chart.data.labels = labels;
                    chart.data.datasets[0].data = json.data;
                    chart.options.scales.y.suggestedMax = media * 2;
                    chart.update();
                }
            });
    }

    function checkCooldown() {
        const cooldown = parseInt(localStorage.getItem('cooldown') || '0');
        const now = Date.now();
        if (cooldown > now) {
            const remaining = cooldown - now;
            const minuti = Math.ceil(remaining / 60000);
            msg.textContent = `Puoi segnalare di nuovo tra ${minuti} minuti.`;
            btnSegnala.disabled = true;
            return true;
        }
        return false;
    }

    btnSegnala.onclick = () => {
        if (checkCooldown()) return;

        fetch('/api/segnala', { method: 'POST' })
            .then(res => res.json())
            .then(json => {
                msg.textContent = json.message;
                if (json.success) {
                    const cooldown = Date.now() + 30 * 60 * 1000;
                    localStorage.setItem('cooldown', cooldown.toString());
                    btnSegnala.disabled = true;
                    aggiornaGrafico();
                } else {
                    const match = json.message.match(/tra (\d+) minuti/);
                    if (match) {
                        const minuti = parseInt(match[1]);
                        const cooldown = Date.now() + minuti * 60 * 1000;
                        localStorage.setItem('cooldown', cooldown.toString());
                        btnSegnala.disabled = true;
                    }
                }
            }).catch(() => {
                msg.textContent = 'Errore di rete. Riprova più tardi.';
            });
    };

    if (checkCooldown()) {
        btnSegnala.disabled = true;
    }

    aggiornaGrafico();
    setInterval(aggiornaGrafico, 5 * 60 * 1000);
};
