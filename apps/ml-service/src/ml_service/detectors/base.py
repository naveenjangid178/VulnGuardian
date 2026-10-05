from abc import ABC, abstractmethod
from ..features.tokenizer import CodeTokenizer
from ..models.analysis import SourceFileInput
from ..models.detection import DetectionResult


# Abstract Base Class defining the contract for all 6 ML vulnerability detectors
class BaseDetector(ABC):

    def __init__(self) -> None:
        # Initialize lexical tokenizer for feature extraction
        self.tokenizer = CodeTokenizer()

    @property
    @abstractmethod
    def vulnerability_slug(self) -> str:
        """Returns the canonical vulnerability slug e.g. sql-injection"""
        pass

    @abstractmethod
    def analyze_file(self, file_input: SourceFileInput) -> list[DetectionResult]:
        """Runs ML classification against a single source file and returns detections."""
        pass
