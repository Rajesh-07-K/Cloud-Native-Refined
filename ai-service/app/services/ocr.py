import os
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from app.config import settings


# Configure Tesseract
if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def extract_text_from_file(file_path: str, mime_type: str) -> str:
    """Extract text from PDF or image with detailed diagnostics."""

    print("\n========== OCR DEBUG ==========")
    print(f"[OCR] File: {file_path}")
    print(f"[OCR] Exists: {os.path.exists(file_path)}")
    print(f"[OCR] MIME type: {mime_type}")
    print(f"[OCR] Tesseract: {settings.TESSERACT_CMD}")
    print(f"[OCR] Poppler: {settings.POPPLER_PATH}")

    try:
        # Check file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        text = ""

        # --------------------------------------------------
        # PDF
        # --------------------------------------------------
        if "pdf" in mime_type.lower():

            print("[OCR] Converting PDF to images...")

            pages = convert_from_path(
                file_path,
                dpi=300,
                poppler_path=settings.POPPLER_PATH
            )

            print(f"[OCR] PDF pages converted: {len(pages)}")

            if not pages:
                raise RuntimeError("Poppler returned zero pages")

            for index, page in enumerate(pages, start=1):

                print(f"[OCR] Processing page {index}...")
                print(f"[OCR] Image size: {page.size}")

                page_text = pytesseract.image_to_string(
                    page,
                    config="--psm 6"
                )

                print(
                    f"[OCR] Page {index} extracted "
                    f"{len(page_text)} characters"
                )

                print(
                    f"[OCR] Preview: "
                    f"{repr(page_text[:200])}"
                )

                text += page_text + "\n"

        # --------------------------------------------------
        # IMAGE
        # --------------------------------------------------
        elif "image" in mime_type.lower():

            print("[OCR] Opening image...")

            image = Image.open(file_path)

            print(f"[OCR] Image size: {image.size}")
            print(f"[OCR] Image mode: {image.mode}")

            text = pytesseract.image_to_string(
                image,
                config="--psm 6"
            )

            print(
                f"[OCR] Extracted {len(text)} characters"
            )

            print(
                f"[OCR] Preview: {repr(text[:200])}"
            )

        # --------------------------------------------------
        # TEXT
        # --------------------------------------------------
        else:

            print("[OCR] Reading as plain text...")

            with open(
                file_path,
                "r",
                encoding="utf-8"
            ) as f:
                text = f.read()

        text = text.strip()

        print(
            f"[OCR] FINAL extracted characters: {len(text)}"
        )

        if not text:
            print("[OCR WARNING] OCR produced EMPTY TEXT")

        print("========== OCR END ==========\n")

        return text

    except Exception as e:

        print("\n========== OCR ERROR ==========")
        print(f"[OCR Error Type] {type(e).__name__}")
        print(f"[OCR Error Message] {str(e)}")
        print("================================\n")

        # During debugging, re-raise the exception
        # instead of silently returning ""
        raise