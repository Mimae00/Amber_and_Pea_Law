package com.amberpea.law.review;

import java.time.LocalDate;

public record ReviewDto(
        Long id,
        String authorName,
        int rating,
        String content,
        String practiceAreaSlug,
        String practiceAreaName,
        LocalDate reviewDate,
        boolean published) {

    public static ReviewDto from(Review r) {
        var pa = r.getPracticeArea();
        return new ReviewDto(r.getId(), r.getAuthorName(), r.getRating(), r.getContent(),
                pa == null ? null : pa.getSlug(), pa == null ? null : pa.getName(), r.getReviewDate(),
                r.isPublished());
    }
}
