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