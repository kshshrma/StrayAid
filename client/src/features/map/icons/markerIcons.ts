import L from "leaflet";

function createMarker(color: string) {
  return new L.DivIcon({
    className: "",
    html: `
      <div style="
        width:22px;
        height:22px;
        border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 0 8px rgba(0,0,0,.4);
      ">
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export const criticalMarker = createMarker("#dc2626");

export const highMarker = createMarker("#ea580c");

export const mediumMarker = createMarker("#eab308");

export const lowMarker = createMarker("#16a34a");

export const guardianMarker = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:24px;
      height:24px;
      border-radius:50%;
      background:#2563eb;
      border:3px solid white;
      box-shadow:0 0 10px rgba(37,99,235,.6);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:12px;
    ">
      🛡️
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const meMarker = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:22px;
      height:22px;
      border-radius:50%;
      background:#06b6d4;
      border:3px solid white;
      box-shadow:0 0 8px rgba(6,182,212,.6);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:10px;
    ">
      📍
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});