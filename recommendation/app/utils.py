from pathlib import Path
from typing import Any

import pickle


def ensure_parent_dir(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    return target


def dump_pickle(value: Any, path: str | Path) -> None:
    target = ensure_parent_dir(path)
    with target.open("wb") as file:
        pickle.dump(value, file)


def load_pickle(path: str | Path) -> Any:
    with Path(path).open("rb") as file:
        return pickle.load(file)
