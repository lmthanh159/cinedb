from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.recommender.trainer import train_all


if __name__ == "__main__":
    result = train_all()
    print(
        "Training complete. "
        f"Movies: {result['movies']}, ratings: {result['ratings']}, "
        f"last_trained: {result['last_trained']}"
    )
