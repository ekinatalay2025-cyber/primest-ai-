"""
Harita Servisi - Folium ile dinamik haritalar
Tarihsel sınırlar, olay konumları
"""
from pathlib import Path
from typing import List, Tuple

MAPS_DIR = Path(__file__).parent.parent / "output" / "maps"
MAPS_DIR.mkdir(parents=True, exist_ok=True)


def create_historical_map(
    center: Tuple[float, float] = (39.0, 35.0),  # Türkiye
    zoom: int = 4,
    markers: List[dict] = None,
    title: str = "Tarihsel Harita",
) -> str:
    """
    Folium ile interaktif harita oluştur.
    markers: [{"lat": 41, "lon": 29, "popup": "İstanbul"}]
    """
    try:
        import folium
    except ImportError:
        raise ImportError("folium kurulu değil: pip install folium")
    
    m = folium.Map(location=center, zoom_start=zoom, tiles="CartoDB dark_matter")
    folium.Marker(center, popup=title).add_to(m)
    
    for mk in markers or []:
        folium.Marker(
            [mk.get("lat", 0), mk.get("lon", 0)],
            popup=mk.get("popup", ""),
        ).add_to(m)
    
    out_path = MAPS_DIR / f"map_{hash(title) % 10**8}.html"
    m.save(str(out_path))
    return str(out_path)
