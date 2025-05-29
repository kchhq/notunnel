export async function drawRoute(
  map,
  startLng, startLat,
  endLng,   endLat,
  searchOption = "0",
  avoidTunnels = false,
  highlightTunnels = false
) {
  async function fetchRoute(opt) {
    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "appKey": "i21eBayOYj3UmtuIrwnnuaRfBIXFN5Fx9sQyQeIE"
        },
        body: JSON.stringify({
          startX: startLng.toString(),
          startY: startLat.toString(),
          endX:   endLng.toString(),
          endY:   endLat.toString(),
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          searchOption: opt,
          avoidOption: avoidTunnels ? "16" : "0"
        })
      }
    );
    return res.json();
  }

  let data;
  let fallbackUsed = false;

  if (avoidTunnels) {
    const alternatives = ["0", "1", "2", "3", "4"];
    let found = false;

    for (const opt of alternatives) {
      const candidate = await fetchRoute(opt);
      const hasTunnel = candidate.features?.some(f =>
        f.geometry.type === "LineString" &&
        Number(f.properties.facilityType) === 2
      );

      console.log(`옵션 ${opt}: 터널 포함?`, hasTunnel);

      if (!hasTunnel && candidate.features?.length) {
        data = candidate;
        console.log(`터널 없는 경로 찾음! searchOption: ${opt}`);
        found = true;
        break;
      }
    }

    if (!found) {
      alert("모든 옵션에서 터널 없는 경로를 찾지 못했습니다. 기본 경로를 사용합니다.");
      data = await fetchRoute(searchOption);
      fallbackUsed = true; // fallback 상태 표시
    }
  } else {
    data = await fetchRoute(searchOption);
  }

  if (!data.features?.length) {
    alert("경로를 찾을 수 없습니다.");
    return { mainPolyline: null, tunnelPolyline: null, instructions: [] };
  }

  const normalPath   = [];
  const tunnelPath   = [];
  const instructions = [];

  data.features.forEach(f => {
    if (f.geometry.type === "LineString") {
      const seg = f.geometry.coordinates.map(
        ([lng, lat]) => new kakao.maps.LatLng(lat, lng)
      );
      const ft = Number(f.properties.facilityType);

      // 터널 회피 경로 탐색에 실패 후 기본 경로 추천 상태에서는 터널 구간도 nomalPath에 포함
      if (fallbackUsed) {
        normalPath.push(...seg);
      } else {
        if (ft === 2) {
          tunnelPath.push(...seg);
        }
        if (!avoidTunnels || ft !== 2) {
          normalPath.push(...seg);
        }
      }
    } else if (f.geometry.type === "Point") {
      const desc = f.properties.description?.trim();
      if (desc) instructions.push(desc);
    }
  });

  const mainPolyline = new kakao.maps.Polyline({
    path: normalPath,
    strokeWeight: 4,
    strokeColor: "#FF6600",
    strokeOpacity: 0.8,
    strokeStyle: "solid",
    map
  });

  let tunnelPolyline = null;
  if (highlightTunnels && tunnelPath.length) {
    tunnelPolyline = new kakao.maps.Polyline({
      path: tunnelPath,
      strokeWeight: 6,
      strokeColor: "#FF0000",
      strokeOpacity: 0.7,
      strokeStyle: "dashed",
      map
    });
  }

  return { mainPolyline, tunnelPolyline, instructions };
}
