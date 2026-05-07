"""Regenerate UDCSP synthetic data. Optional Faker can be installed from requirements.txt for richer names; deterministic fallbacks are used by default. No real PII or checksum-valid national IDs are emitted."""
from pathlib import Path
import runpy
ROOT = Path(__file__).resolve().parents[1]
print("Use data/synthetic/scripts/Generate-All.ps1 to regenerate the full deterministic dataset scaffold.")
