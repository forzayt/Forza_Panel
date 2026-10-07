"use client";

export default function InstallLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <style>{`
        .il-main { display: flex; justify-content: center; align-items: center; height: 100%; width: 100%; }
        .il-loader { width: 100%; }
        .il-trace-bg { stroke: #333; stroke-width: 1.8; fill: none; }
        .il-trace-flow {
          stroke-width: 1.8;
          fill: none;
          stroke-dasharray: 40 400;
          stroke-dashoffset: 438;
          filter: drop-shadow(0 0 6px currentColor);
          animation: il-flow 3s cubic-bezier(0.5, 0, 0.9, 1) infinite;
        }
        .il-yellow { stroke: #ffea00; color: #ffea00; }
        .il-blue { stroke: #00ccff; color: #00ccff; }
        .il-green { stroke: #00ff15; color: #00ff15; }
        .il-purple { stroke: #9900ff; color: #9900ff; }
        .il-red { stroke: #ff3300; color: #ff3300; }
        @keyframes il-flow {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div className="il-main">
        <div className="il-loader">
          <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Installing">
            <defs>
              <linearGradient id="il-chipGradient" x1={0} y1={0} x2={0} y2={1}>
                <stop offset="0%" stopColor="#2d2d2d" />
                <stop offset="100%" stopColor="#0f0f0f" />
              </linearGradient>
              <linearGradient id="il-textGradient" x1={0} y1={0} x2={0} y2={1}>
                <stop offset="0%" stopColor="#eeeeee" />
                <stop offset="100%" stopColor="#888888" />
              </linearGradient>
              <linearGradient id="il-pinGradient" x1={1} y1={0} x2={0} y2={0}>
                <stop offset="0%" stopColor="#bbbbbb" />
                <stop offset="50%" stopColor="#888888" />
                <stop offset="100%" stopColor="#555555" />
              </linearGradient>
            </defs>
            <g id="il-traces">
              <path d="M100 100 H200 V210 H326" className="il-trace-bg" />
              <path d="M100 100 H200 V210 H326" className="il-trace-flow il-purple" />
              <path d="M80 180 H180 V230 H326" className="il-trace-bg" />
              <path d="M80 180 H180 V230 H326" className="il-trace-flow il-blue" />
              <path d="M60 260 H150 V250 H326" className="il-trace-bg" />
              <path d="M60 260 H150 V250 H326" className="il-trace-flow il-yellow" />
              <path d="M100 350 H200 V270 H326" className="il-trace-bg" />
              <path d="M100 350 H200 V270 H326" className="il-trace-flow il-green" />
              <path d="M700 90 H560 V210 H474" className="il-trace-bg" />
              <path d="M700 90 H560 V210 H474" className="il-trace-flow il-blue" />
              <path d="M740 160 H580 V230 H474" className="il-trace-bg" />
              <path d="M740 160 H580 V230 H474" className="il-trace-flow il-green" />
              <path d="M720 250 H590 V250 H474" className="il-trace-bg" />
              <path d="M720 250 H590 V250 H474" className="il-trace-flow il-red" />
              <path d="M680 340 H570 V270 H474" className="il-trace-bg" />
              <path d="M680 340 H570 V270 H474" className="il-trace-flow il-yellow" />
            </g>
            <rect x={330} y={190} width={140} height={100} rx={20} ry={20} fill="url(#il-chipGradient)" stroke="#222" strokeWidth={3} filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))" />
            <g>
              <rect x={322} y={205} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
              <rect x={322} y={225} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
              <rect x={322} y={245} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
              <rect x={322} y={265} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
            </g>
            <g>
              <rect x={470} y={205} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
              <rect x={470} y={225} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
              <rect x={470} y={245} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
              <rect x={470} y={265} width={8} height={10} fill="url(#il-pinGradient)" rx={2} />
            </g>
            <text x={400} y={240} fontFamily="Arial, sans-serif" fontSize={22} fill="url(#il-textGradient)" textAnchor="middle" alignmentBaseline="middle">
              Installing
            </text>
            <circle cx={100} cy={100} r={5} fill="black" />
            <circle cx={80} cy={180} r={5} fill="black" />
            <circle cx={60} cy={260} r={5} fill="black" />
            <circle cx={100} cy={350} r={5} fill="black" />
            <circle cx={700} cy={90} r={5} fill="black" />
            <circle cx={740} cy={160} r={5} fill="black" />
            <circle cx={720} cy={250} r={5} fill="black" />
            <circle cx={680} cy={340} r={5} fill="black" />
          </svg>
        </div>
      </div>
    </div>
  );
}
