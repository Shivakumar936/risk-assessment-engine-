import re

def sanitize_input(text):
    if not text or not isinstance(text, str):
        return None, "Invalid input"

    # Remove HTML tags
    cleaned_text = re.sub(r'<.*?>', '', text)

    # Convert to lowercase for checking
    lower_text = cleaned_text.lower()

    # Detect prompt injection patterns
    dangerous_patterns = [
        "ignore previous instructions",
        "system prompt",
        "bypass",
        "override",
        "act as"
    ]

    for pattern in dangerous_patterns:
        if pattern in lower_text:
            return None, "Suspicious input detected"

    return cleaned_text, None