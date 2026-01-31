const { useEffect, useMemo, useRef, useState } = React;

// Chart global theme
if (window.Chart) {
  Chart.defaults.color = "#a9b6d6";
  Chart.defaults.borderColor = "rgba(255,255,255,.07)";
  Chart.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
}

// ---------- Helpers ----------
function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function formatPct(n) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}
function sum(arr) { return arr.reduce((a,b)=>a+b,0); }

// ---------- Default data ----------
const DEFAULT_DATA = {
  donationsByYear: [
    { year: 2019, amount: 520000 },
    { year: 2020, amount: 610000 },
    { year: 2021, amount: 740000 },
    { year: 2022, amount: 820000 },
    { year: 2023, amount: 910000 },
    { year: 2024, amount: 1020000 },
  ],
  donationMix: [
    { label: "One-time", value: 0.62 },
    { label: "Monthly", value: 0.28 },
    { label: "Employer Match", value: 0.10 },
  ],
  expensesByCategory: [
    { label: "Programs", value: 0.78 },
    { label: "Operations", value: 0.14 },
    { label: "Fundraising", value: 0.08 },
  ],
  impactByYear: [
    { year: 2019, nonprofitsSupported: 16, beneficiaries: 24000, impactScore: 61 },
    { year: 2020, nonprofitsSupported: 19, beneficiaries: 31000, impactScore: 66 },
    { year: 2021, nonprofitsSupported: 22, beneficiaries: 38000, impactScore: 70 },
    { year: 2022, nonprofitsSupported: 25, beneficiaries: 47000, impactScore: 74 },
    { year: 2023, nonprofitsSupported: 27, beneficiaries: 52000, impactScore: 78 },
    { year: 2024, nonprofitsSupported: 30, beneficiaries: 60000, impactScore: 82 },
  ],
  projects: [
    { year: 2024, name: "Workforce Upskilling Cohort", partner: "Neighborhood Skills Lab", funding: 120000, outcome: "Job placements +18%", status: "Completed" },
    { year: 2023, name: "Youth Mentorship Expansion", partner: "Bridge Futures", funding: 85000, outcome: "Students served +1,200", status: "Completed" },
    { year: 2023, name: "Food Access Logistics", partner: "Community Pantry Network", funding: 70000, outcome: "Delivery reliability +22%", status: "Completed" },
    { year: 2022, name: "Housing Navigation Pilot", partner: "HomePath", funding: 95000, outcome: "Stable housing +140", status: "Completed" },
    { year: 2024, name: "Nonprofit Finance Toolkit", partner: "Civic Growth Studio", funding: 60000, outcome: "Runway +4.5 months avg", status: "In Progress" },
  ],
  partnerships: [
    { name: "Corporate Partner A", type: "Corporate", contribution: "Matching Gifts", active: true },
    { name: "Foundation B", type: "Foundation", contribution: "Multi-year Grant", active: true },
    { name: "University C", type: "Academic", contribution: "Pro Bono Fellows", active: true },
    { name: "Consulting D", type: "Pro Bono", contribution: "Strategy & Ops", active: false },
  ],
  risk: [
    { area: "Donor Concentration", score: 0.72, note: "Top donors contribute large share." },
    { area: "Donation Volatility", score: 0.48, note: "Yearly variance moderate." },
    { area: "Program Execution", score: 0.38, note: "Delivery stable across projects." },
    { area: "Economic Sensitivity", score: 0.64, note: "Downturn could reduce giving." },
  ]
};

// ---------- Data Fetcher ----------
function DataFetcher({ onDataFetched, onError }) {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState('mock');
  const [apiUrl, setApiUrl] = useState('https://api.example.com/dashboard-data');
  const [csvData, setCsvData] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const dataSources = [
    { id: 'mock', name: 'Mock Data', description: 'Use built-in sample data' },
    { id: 'api', name: 'API Endpoint', description: 'Fetch from REST API' },
    { id: 'csv', name: 'CSV Upload', description: 'Upload CSV files' },
    { id: 'airtable', name: 'Airtable', description: 'Demo (mock fallback)' },
    { id: 'googleSheets', name: 'Google Sheets', description: 'Demo (mock fallback)' }
  ];

  const fetchFromAPI = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const emptyShape = () => ({
    donationsByYear: [],
    donationMix: [
      { label: "One-time", value: 0.70 },
      { label: "Monthly", value: 0.20 },
      { label: "Employer Match", value: 0.10 },
    ],
    expensesByCategory: [
      { label: "Programs", value: 0.75 },
      { label: "Operations", value: 0.15 },
      { label: "Fundraising", value: 0.10 },
    ],
    impactByYear: [],
    projects: [],
    partnerships: [],
    risk: []
  });

  const transformCSVData = (rows) => {
    const transformed = emptyShape();

    // Expect CSV with columns: year, donations
    rows.forEach((row) => {
      if (row.year && row.donations) {
        transformed.donationsByYear.push({
          year: parseInt(row.year, 10),
          amount: parseFloat(row.donations)
        });
      }
    });

    transformed.donationsByYear.sort((a,b)=>a.year-b.year);

    if (transformed.donationsByYear.length === 0) {
      transformed.donationsByYear = [
        { year: 2023, amount: 0 },
        { year: 2024, amount: 0 }
      ];
    }

    return transformed;
  };

  const parseCSV = (csvString) => new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors?.length) reject(new Error("CSV parsing error"));
        else resolve(transformCSVData(results.data));
      },
      error: reject
    });
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let data;
      if (dataSource === "mock") data = DEFAULT_DATA;
      else if (dataSource === "api") data = await fetchFromAPI(apiUrl);
      else if (dataSource === "csv") {
        if (!csvData) throw new Error("Please paste CSV data or upload a file.");
        data = await parseCSV(csvData);
      } else {
        // Demo sources fallback
        data = DEFAULT_DATA;
      }

      if (!data.donationsByYear || !Array.isArray(data.donationsByYear)) {
        throw new Error("Invalid data structure received");
      }

      onDataFetched(data);
    } catch (e) {
      onError(e.message);
      onDataFetched(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvData(String(e.target.result || ""));
      setDataSource("csv");
    };
    reader.readAsText(file);
  };

  return (
    <div className="dataSourceSelector">
      <h3>Data Source Configuration</h3>

      <div className="sourceOptions">
        {dataSources.map(source => (
          <div
            key={source.id}
            className={`sourceOption ${dataSource === source.id ? 'active' : ''}`}
            onClick={() => setDataSource(source.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e)=> (e.key==="Enter" || e.key===" ") && setDataSource(source.id)}
          >
            {source.name}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <small className="muted">{dataSources.find(s => s.id === dataSource)?.description}</small>
      </div>

      {dataSource === 'api' && (
        <div style={{ marginTop: 12 }}>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="Enter API endpoint URL"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
      )}

      {dataSource === 'csv' && (
        <div style={{ marginTop: 12 }}>
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ marginBottom: 8 }} />
          <textarea
            placeholder="Or paste CSV data here (columns: year, donations)..."
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            style={{
              width: '100%',
              minHeight: 100,
              padding: 8,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace',
              fontSize: 12
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap:"wrap" }}>
        <button className="btn primary" onClick={fetchData} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch Data'}
        </button>
        <button className="btn" onClick={() => setShowSettings(true)}>
          Advanced Settings
        </button>

        {loading && (
          <div className="status loading">
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Fetching data...
          </div>
        )}
      </div>

      {showSettings && (
        <div className="modalOverlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Advanced Data Settings</h2>

            <label>API Key (Optional)</label>
            <input type="password" placeholder="Enter API key if required" />

            <label>Custom Headers (JSON)</label>
            <input placeholder='{"Authorization": "Bearer token"}' defaultValue='{}' />

            <label>Cache Duration (minutes)</label>
            <input type="number" defaultValue="5" min="0" />

            <label>Auto-refresh Interval</label>
            <select defaultValue="0">
              <option value="0">Disabled</option>
              <option value="30000">30 seconds</option>
              <option value="60000">1 minute</option>
              <option value="300000">5 minutes</option>
            </select>

            <div className="modalActions">
              <button className="btn" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn primary" onClick={() => setShowSettings(false)}>Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Chart card ----------
function ChartCard({ title, subtitle, type, data, options }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, { type, data, options });

    return () => chartRef.current?.destroy();
  }, [title, type, data, options]);

  return (
    <div className="card">
      <h2>{title}</h2>
      {subtitle ? <div className="muted" style={{ marginBottom: 10, fontSize: 12 }}>{subtitle}</div> : null}
      <canvas ref={canvasRef} height="130"></canvas>
    </div>
  );
}

// ---------- UI ----------
function KPI({ label, value, delta, tone="good" }) {
  return (
    <div className="card">
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div className="kpi">
        <div className="value">{value}</div>
        {delta != null ? <div className={`delta ${tone}`}>{delta}</div> : null}
      </div>
    </div>
  );
}
function Badge({ children, tone }) {
  return <span className={`badge ${tone || ""}`}>{children}</span>;
}
function riskTone(score){
  if (score >= 0.66) return "bad";
  if (score >= 0.45) return "warn";
  return "good";
}

const TABS = [
  { key: "home", label: "Home" },
  { key: "donations", label: "Donations" },
  { key: "expenses", label: "Expenses" },
  { key: "impact", label: "Impact" },
  { key: "projects", label: "Projects" },
  { key: "partnerships", label: "Partnerships" },
  { key: "risk", label: "Risk & Insights" },
  { key: "data", label: "Data Source" },
];

function App(){
  const [tab, setTab] = useState("home");
  const [mode, setMode] = useState("one-time");
  const [dashboardData, setDashboardData] = useState(DEFAULT_DATA);
  const [fetchError, setFetchError] = useState(null);
  const [dataLastFetched, setDataLastFetched] = useState(new Date());

  const handleDataFetched = (data) => {
    setDashboardData(data);
    setFetchError(null);
    setDataLastFetched(new Date());
  };
  const handleFetchError = (error) => setFetchError(error);

  const donationTotal = useMemo(() => sum(dashboardData.donationsByYear.map(d=>d.amount)), [dashboardData]);
  const lastYear = useMemo(() => dashboardData.donationsByYear[dashboardData.donationsByYear.length - 1] || { year: 0, amount: 0 }, [dashboardData]);
  const prevYear = useMemo(() => dashboardData.donationsByYear[dashboardData.donationsByYear.length - 2] || { year: 0, amount: 0 }, [dashboardData]);
  const yoy = useMemo(() => prevYear.amount ? (lastYear.amount - prevYear.amount) / prevYear.amount : 0, [lastYear, prevYear]);

  const programPct = useMemo(() => (dashboardData.expensesByCategory.find(x=>x.label==="Programs")?.value ?? 0), [dashboardData]);
  const adminPct = 1 - programPct;

  const impactLast = useMemo(() => dashboardData.impactByYear[dashboardData.impactByYear.length - 1] || { impactScore: 0, beneficiaries: 0, nonprofitsSupported: 0, year: 0 }, [dashboardData]);
  const impactPrev = useMemo(() => dashboardData.impactByYear[dashboardData.impactByYear.length - 2] || { impactScore: 0 }, [dashboardData]);
  const impactScoreDelta = useMemo(() => impactPrev.impactScore ? (impactLast.impactScore - impactPrev.impactScore) / impactPrev.impactScore : 0, [impactLast, impactPrev]);

  const donateSuggested = mode === "monthly" ? 25 : 100;

  function downloadJSON(){
    const payload = { generatedAt: new Date().toISOString(), lastFetched: dataLastFetched.toISOString(), ...dashboardData };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "svp_dashboard_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>SVP Boston — Transparency & Impact Dashboard</h1>
            <p>Donations • Expenses • Impact • Projects • Partnerships • Risk</p>
            <p style={{ fontSize: 10, marginTop: 2, color:"var(--muted)" }}>
              Data last fetched: {dataLastFetched.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="actions">
          {fetchError && <div className="status error" style={{ fontSize: 11 }}>⚠️ {fetchError}</div>}
          <button className="btn" onClick={downloadJSON}>Export Data</button>
          <button className="btn primary" onClick={()=>setTab("donations")}>Donate</button>
        </div>
      </div>

      <div className="container">
        <div className="nav" role="tablist" aria-label="Dashboard tabs">
          {TABS.map(t => (
            <div
              key={t.key}
              className={`tab ${tab===t.key ? "active" : ""}`}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={()=>setTab(t.key)}
              onKeyDown={(e)=> (e.key==="Enter" || e.key===" ") && setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>

        {tab === "data" && (
          <div id="panel-data" role="tabpanel" aria-labelledby="tab-data">
            <DataFetcher onDataFetched={handleDataFetched} onError={handleFetchError} />
            <div className="card">
              <h2>Current Data Preview</h2>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Years of donation data: {dashboardData.donationsByYear.length}
              </div>
              <div className="dataPreview">
                {JSON.stringify({
                  donationsByYear: dashboardData.donationsByYear,
                  expensesByCategory: dashboardData.expensesByCategory,
                  projectsCount: dashboardData.projects.length,
                  partnershipsCount: dashboardData.partnerships.length
                }, null, 2)}
              </div>
              <div className="footerNote">
                CSV expects columns: <b>year</b>, <b>donations</b>. API should return the same object shape as DEFAULT_DATA.
              </div>
            </div>
          </div>
        )}

        {tab === "home" && (
          <div id="panel-home" role="tabpanel" aria-labelledby="tab-home">
            <div className="grid cols-4">
              <KPI label="Total Donations (Lifetime)" value={formatMoney(donationTotal)} delta={formatPct(yoy)} tone={yoy>=0 ? "good" : "bad"} />
              <KPI label="Latest Year Donations" value={formatMoney(lastYear.amount)} delta={`${lastYear.year}`} tone="warn" />
              <KPI label="Program Spend Ratio" value={`${(programPct*100).toFixed(0)}%`} delta={`Admin: ${(adminPct*100).toFixed(0)}%`} tone="good" />
              <KPI label="Impact Score (Latest)" value={`${impactLast.impactScore}`} delta={formatPct(impactScoreDelta)} tone={impactScoreDelta>=0 ? "good" : "bad"} />
            </div>

            <div className="sectionTitle">
              <span>At-a-glance analytics</span>
              <span className="muted">Use “Data Source” to connect real data</span>
            </div>

            <div className="grid cols-3">
              <ChartCard
                title="Donations by Year"
                subtitle="Shows growth trend over time"
                type="line"
                data={{
                  labels: dashboardData.donationsByYear.map(d=>d.year),
                  datasets: [{
                    label:"Donations",
                    data: dashboardData.donationsByYear.map(d=>d.amount),
                    tension: 0.3
                  }]
                }}
                options={{
                  responsive:true,
                  plugins:{
                    legend:{ labels:{ color:"#eaf0ff" } },
                    tooltip:{ callbacks:{ label:(c)=> `$${Number(c.raw).toLocaleString()}` } }
                  },
                  scales:{
                    x:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } },
                    y:{ ticks:{ color:"#a9b6d6", callback:(v)=>"$"+(v/1000)+"k" }, grid:{ color:"rgba(255,255,255,.07)" } }
                  }
                }}
              />

              <ChartCard
                title="Expense Allocation"
                subtitle="Programs vs operations vs fundraising"
                type="doughnut"
                data={{
                  labels: dashboardData.expensesByCategory.map(x=>x.label),
                  datasets: [{
                    label:"Share",
                    data: dashboardData.expensesByCategory.map(x=>Math.round(x.value*100))
                  }]
                }}
                options={{
                  plugins:{
                    legend:{ labels:{ color:"#eaf0ff" } },
                    tooltip:{ callbacks:{ label:(c)=> `${c.label}: ${c.raw}%` } }
                  }
                }}
              />

              <ChartCard
                title="Impact Score Trend"
                subtitle="Composite index (demo)"
                type="bar"
                data={{
                  labels: dashboardData.impactByYear.map(d=>d.year),
                  datasets: [{
                    label:"Impact Score",
                    data: dashboardData.impactByYear.map(d=>d.impactScore)
                  }]
                }}
                options={{
                  plugins:{ legend:{ labels:{ color:"#eaf0ff" } } },
                  scales:{
                    x:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } },
                    y:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } }
                  }
                }}
              />
            </div>

            <div className="footerNote">
              Next: connect real SVP Boston data (annual report, Form 990, or internal CRM exports) and refine the KPI definitions.
            </div>
          </div>
        )}

        {tab === "donations" && (
          <div id="panel-donations" role="tabpanel" aria-labelledby="tab-donations">
            <div className="grid cols-4">
              <KPI label="Total Raised (Lifetime)" value={formatMoney(donationTotal)} />
              <KPI label="YoY Growth (Latest)" value={formatPct(yoy)} tone={yoy>=0?"good":"bad"} />
              <KPI label="Avg Donation (Demo)" value={formatMoney(185)} delta="Estimated" tone="warn" />
              <KPI label="Recurring Share" value={`${Math.round((dashboardData.donationMix.find(x=>x.label==="Monthly")?.value ?? 0)*100)}%`} delta="Monthly donors" tone="good" />
            </div>

            <div className="sectionTitle">
              <span>Donation overview</span>
              <span className="muted">Build donor trust + retention</span>
            </div>

            <div className="grid cols-2">
              <ChartCard
                title="Donations by Year"
                subtitle="Total gifts received each year"
                type="line"
                data={{
                  labels: dashboardData.donationsByYear.map(d=>d.year),
                  datasets: [{ label:"Donations", data: dashboardData.donationsByYear.map(d=>d.amount), tension: 0.3 }]
                }}
                options={{
                  plugins:{ legend:{ labels:{ color:"#eaf0ff" } }, tooltip:{ callbacks:{ label:(c)=> `$${Number(c.raw).toLocaleString()}` } } },
                  scales:{
                    x:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } },
                    y:{ ticks:{ color:"#a9b6d6", callback:(v)=>"$"+(v/1000)+"k" }, grid:{ color:"rgba(255,255,255,.07)" } }
                  }
                }}
              />

              <div className="card">
                <h2>Donate (Demo Module)</h2>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  UI demo — connect Stripe/PayPal later.
                </div>

                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom: 10 }}>
                  <button className={`btn ${mode==="one-time" ? "primary" : ""}`} onClick={()=>setMode("one-time")}>One-time</button>
                  <button className={`btn ${mode==="monthly" ? "primary" : ""}`} onClick={()=>setMode("monthly")}>Monthly</button>
                </div>

                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Suggested amount</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
                  {formatMoney(donateSuggested)}
                </div>

                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Donation mix</div>
                <table className="table">
                  <thead><tr><th>Type</th><th>Share</th></tr></thead>
                  <tbody>
                    {(dashboardData.donationMix || []).map(x=>(
                      <tr key={x.label}>
                        <td>{x.label}</td>
                        <td>{Math.round(x.value*100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 12, display:"flex", gap:10 }}>
                  <button className="btn primary" onClick={()=>alert("Demo: connect payment processor here.")}>
                    Continue to Payment
                  </button>
                  <button className="btn" onClick={()=>alert("Demo: link employer matching tool.")}>
                    Employer Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "expenses" && (
          <div id="panel-expenses" role="tabpanel" aria-labelledby="tab-expenses">
            <div className="grid cols-4">
              <KPI label="Program Spend" value={`${Math.round(programPct*100)}%`} delta="Target: ≥75%" tone="good" />
              <KPI label="Ops + Fundraising" value={`${Math.round((1-programPct)*100)}%`} delta="Efficiency" tone="warn" />
              <KPI label="Cost per Nonprofit (Demo)" value={formatMoney(32000)} delta="Estimated" tone="warn" />
              <KPI label="Admin Efficiency (Demo)" value="High" delta="Benchmarking" tone="good" />
            </div>

            <div className="sectionTitle">
              <span>Expense transparency</span>
              <span className="muted">Where donations go</span>
            </div>

            <div className="grid cols-2">
              <ChartCard
                title="Expense Allocation"
                subtitle="Share of total spending"
                type="doughnut"
                data={{
                  labels: dashboardData.expensesByCategory.map(x=>x.label),
                  datasets: [{ label:"Share", data: dashboardData.expensesByCategory.map(x=>Math.round(x.value*100)) }]
                }}
                options={{ plugins:{ legend:{ labels:{ color:"#eaf0ff" } }, tooltip:{ callbacks:{ label:(c)=> `${c.label}: ${c.raw}%` } } } }}
              />

              <div className="card">
                <h2>Expense Summary</h2>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Back this with audited reports / Form 990.
                </div>
                <table className="table">
                  <thead><tr><th>Category</th><th>Share</th><th>Signal</th></tr></thead>
                  <tbody>
                    {dashboardData.expensesByCategory.map(x=>(
                      <tr key={x.label}>
                        <td>{x.label}</td>
                        <td>{Math.round(x.value*100)}%</td>
                        <td>{x.label==="Programs" ? <Badge tone="good">High impact</Badge> : <Badge tone="warn">Monitor</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="footerNote">
                  Recommended: keep program spend strong while investing in systems/compliance to scale.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "impact" && (
          <div id="panel-impact" role="tabpanel" aria-labelledby="tab-impact">
            <div className="grid cols-4">
              <KPI label="Nonprofits Supported (Latest)" value={`${impactLast.nonprofitsSupported}`} delta={`${impactLast.year}`} tone="good" />
              <KPI label="Beneficiaries (Latest)" value={`${impactLast.beneficiaries.toLocaleString()}`} delta="Estimated" tone="warn" />
              <KPI label="Impact Score" value={`${impactLast.impactScore}`} delta={formatPct(impactScoreDelta)} tone="good" />
              <KPI label="Sustainability (Demo)" value="84%" delta="Proxy" tone="good" />
            </div>

            <div className="sectionTitle">
              <span>Impact analytics</span>
              <span className="muted">Outcome metrics donors care about</span>
            </div>

            <div className="grid cols-2">
              <ChartCard
                title="Beneficiaries by Year"
                subtitle="Estimated community reach"
                type="line"
                data={{
                  labels: dashboardData.impactByYear.map(d=>d.year),
                  datasets: [{ label:"Beneficiaries", data: dashboardData.impactByYear.map(d=>d.beneficiaries), tension: 0.3 }]
                }}
                options={{
                  plugins:{ legend:{ labels:{ color:"#eaf0ff" } } },
                  scales:{
                    x:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } },
                    y:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } }
                  }
                }}
              />

              <ChartCard
                title="Impact Score Trend"
                subtitle="Composite index (demo)"
                type="bar"
                data={{
                  labels: dashboardData.impactByYear.map(d=>d.year),
                  datasets: [{ label:"Impact Score", data: dashboardData.impactByYear.map(d=>d.impactScore) }]
                }}
                options={{
                  plugins:{ legend:{ labels:{ color:"#eaf0ff" } } },
                  scales:{
                    x:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } },
                    y:{ ticks:{ color:"#a9b6d6" }, grid:{ color:"rgba(255,255,255,.07)" } }
                  }
                }}
              />
            </div>

            <div className="footerNote">
              Replace demo impact score with real KPIs (e.g., grantee survival, revenue growth, people served).
            </div>
          </div>
        )}

        {tab === "projects" && (
          <div id="panel-projects" role="tabpanel" aria-labelledby="tab-projects">
            <div className="sectionTitle">
              <span>Projects accomplished</span>
              <span className="muted">Portfolio of outcomes</span>
            </div>

            <div className="card">
              <h2>Project List</h2>
              <table className="table">
                <thead>
                  <tr><th>Year</th><th>Project</th><th>Partner</th><th>Funding</th><th>Outcome</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {dashboardData.projects.slice().sort((a,b)=>b.year-a.year).map((p, idx)=>(
                    <tr key={idx}>
                      <td>{p.year}</td>
                      <td>{p.name}</td>
                      <td>{p.partner}</td>
                      <td>{formatMoney(p.funding)}</td>
                      <td>{p.outcome}</td>
                      <td>{p.status==="Completed" ? <Badge tone="good">Completed</Badge> : <Badge tone="warn">In Progress</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="footerNote">
                Next: add filters (year/category/status) + project detail pages.
              </div>
            </div>
          </div>
        )}

        {tab === "partnerships" && (
          <div id="panel-partnerships" role="tabpanel" aria-labelledby="tab-partnerships">
            <div className="grid cols-4">
              <KPI label="Active Partnerships" value={`${dashboardData.partnerships.filter(p=>p.active).length}`} tone="good" />
              <KPI label="Total Partners" value={`${dashboardData.partnerships.length}`} tone="warn" />
              <KPI label="Pro Bono Value (Demo)" value={formatMoney(180000)} tone="good" />
              <KPI label="Corporate Match Utilization (Demo)" value="Medium" tone="warn" />
            </div>

            <div className="sectionTitle">
              <span>Partnership ecosystem</span>
              <span className="muted">Financial + advisory leverage</span>
            </div>

            <div className="card">
              <h2>Partners</h2>
              <table className="table">
                <thead><tr><th>Name</th><th>Type</th><th>Contribution</th><th>Status</th></tr></thead>
                <tbody>
                  {dashboardData.partnerships.map((p, idx)=>(
                    <tr key={idx}>
                      <td>{p.name}</td>
                      <td>{p.type}</td>
                      <td>{p.contribution}</td>
                      <td>{p.active ? <Badge tone="good">Active</Badge> : <Badge tone="warn">Inactive</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="footerNote">
                Recommended: expand employer matching + pro bono partnerships to multiply impact.
              </div>
            </div>
          </div>
        )}

        {tab === "risk" && (
          <div id="panel-risk" role="tabpanel" aria-labelledby="tab-risk">
            <div className="grid cols-3">
              {dashboardData.risk.map((r, idx)=>(
                <div className="card" key={idx}>
                  <h2>{r.area}</h2>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{r.note}</div>
                  <div className="kpi">
                    <div className="value">{Math.round(r.score*100)}</div>
                    <div className={`delta ${riskTone(r.score)}`}>
                      {riskTone(r.score)==="bad" ? "High Risk" : riskTone(r.score)==="warn" ? "Medium" : "Low"}
                    </div>
                  </div>
                  <div className="footerNote">
                    Suggested action: {r.area==="Donor Concentration"
                      ? "Diversify donor base; grow recurring donors."
                      : r.area==="Economic Sensitivity"
                      ? "Build reserves; expand multi-year commitments."
                      : r.area==="Donation Volatility"
                      ? "Stabilize via monthly giving campaigns."
                      : "Keep measuring outcomes + execution milestones."}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <h2>Recommended Actions (Board-ready)</h2>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.8 }}>
                <li><b style={{ color: "var(--text)" }}>Increase recurring donations</b> to reduce volatility and improve planning.</li>
                <li><b style={{ color: "var(--text)" }}>Launch employer matching push</b> to multiply donations with low overhead.</li>
                <li><b style={{ color: "var(--text)" }}>Prioritize high-ROI programs</b> (impact per dollar) and publish outcomes.</li>
                <li><b style={{ color: "var(--text)" }}>Improve transparency</b> with annual report + audited financial links.</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
