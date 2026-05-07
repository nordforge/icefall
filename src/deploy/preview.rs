pub fn sanitize_branch_for_subdomain(branch: &str) -> String {
    let sanitized: String = branch
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();

    let trimmed = sanitized.trim_matches('-').to_string();

    if trimmed.len() > 63 {
        trimmed[..63].trim_end_matches('-').to_string()
    } else {
        trimmed
    }
}

pub fn matches_preview_pattern(pattern: &Option<String>, branch: &str) -> bool {
    match pattern {
        None => true,
        Some(pat) => glob_match(pat, branch),
    }
}

fn glob_match(pattern: &str, text: &str) -> bool {
    if pattern == "*" {
        return true;
    }

    let parts: Vec<&str> = pattern.split('*').collect();

    if parts.len() == 1 {
        return pattern == text;
    }

    let mut pos = 0;
    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }
        match text[pos..].find(part) {
            Some(found) => {
                if i == 0 && found != 0 {
                    return false;
                }
                pos += found + part.len();
            }
            None => return false,
        }
    }

    if let Some(last) = parts.last() {
        if !last.is_empty() {
            return text.ends_with(last);
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_feature_branch() {
        assert_eq!(
            sanitize_branch_for_subdomain("feature/PROJ-123-add-auth"),
            "feature-proj-123-add-auth"
        );
    }

    #[test]
    fn sanitizes_dots_and_special_chars() {
        assert_eq!(
            sanitize_branch_for_subdomain("release/v2.0.0"),
            "release-v2-0-0"
        );
    }

    #[test]
    fn strips_leading_trailing_hyphens() {
        assert_eq!(
            sanitize_branch_for_subdomain("--weird-branch--"),
            "weird-branch"
        );
    }

    #[test]
    fn truncates_long_branches() {
        let long = "a".repeat(100);
        let result = sanitize_branch_for_subdomain(&long);
        assert!(result.len() <= 63);
    }

    #[test]
    fn pattern_none_matches_all() {
        assert!(matches_preview_pattern(&None, "feature/anything"));
        assert!(matches_preview_pattern(&None, "main"));
    }

    #[test]
    fn pattern_wildcard_matches() {
        let pat = Some("feature/*".to_string());
        assert!(matches_preview_pattern(&pat, "feature/add-auth"));
        assert!(matches_preview_pattern(&pat, "feature/PROJ-123"));
        assert!(!matches_preview_pattern(&pat, "hotfix/urgent"));
    }

    #[test]
    fn pattern_exact_match() {
        let pat = Some("develop".to_string());
        assert!(matches_preview_pattern(&pat, "develop"));
        assert!(!matches_preview_pattern(&pat, "development"));
    }
}
