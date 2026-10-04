package com.amberpea.law.practicearea;

/**
 * Public view of a practice area.
 */
public record PracticeAreaDto(Long id, String slug, String name, String summary, String description, int sortOrder,
        boolean active) {

    public static PracticeAreaDto from(PracticeArea p) {
        return new PracticeAreaDto(p.getId(), p.getSlug(), p.getName(), p.getSummary(), p.getDescription(),
                p.getSortOrder(), p.isActive());
    }
}
