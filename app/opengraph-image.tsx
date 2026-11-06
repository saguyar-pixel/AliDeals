import { ImageResponse } from "next/og";

export const alt = "AliDeals IL — Verified AliExpress Reviews & Tax-Free Deals";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #3b0764 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top Brand Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #ff5c5c 0%, #e62e04 60%, #b81b00 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "34px",
                fontWeight: 900,
                boxShadow: "0 12px 30px rgba(230, 46, 4, 0.45)",
              }}
            >
              A
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "38px", fontWeight: 900, letterSpacing: "-0.02em" }}>
                AliDeals IL
              </span>
              <span style={{ fontSize: "18px", color: "#94a3b8", fontWeight: 600 }}>
                ali-deals.co.il
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 24px",
              borderRadius: "999px",
              background: "rgba(16, 185, 129, 0.16)",
              border: "2px solid rgba(52, 211, 153, 0.4)",
              color: "#6ee7b7",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            <span>Under $75 Tax-Free Verified</span>
          </div>
        </div>

        {/* Center Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: "66px",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Smart AliExpress Deals & In-Depth Reviews for Israel
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#cbd5e1",
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            220V EU Plug Checks • Live ILS Pricing • TOP 5 Comparisons • Customs Calculator
          </div>
        </div>

        {/* Bottom Feature Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              padding: "14px 26px",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontSize: "22px",
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            ★ 4.8+ Rated Finds
          </div>
          <div
            style={{
              padding: "14px 26px",
              borderRadius: "18px",
              background: "rgba(230, 46, 4, 0.22)",
              border: "1px solid rgba(251, 146, 60, 0.4)",
              fontSize: "22px",
              fontWeight: 700,
              color: "#fed7aa",
            }}
          >
            ₪ ILS Live Prices
          </div>
          <div
            style={{
              padding: "14px 26px",
              borderRadius: "18px",
              background: "rgba(99, 102, 241, 0.22)",
              border: "1px solid rgba(129, 140, 248, 0.4)",
              fontSize: "22px",
              fontWeight: 700,
              color: "#e0e7ff",
            }}
          >
            EU 220V Verified
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
