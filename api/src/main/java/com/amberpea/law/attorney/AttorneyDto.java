package com.amberpea.law.attorney;

import java.util.List;

import com.amberpea.law.practicearea.PracticeArea;

/**
 * Public view of an attorney profile.
 */
public record AttorneyDto(
        Long id,
        String slug,
        String fullName,
        String title,
        String shortBio,
        String bio,
        String photoUrl,
        String education,
        String barAdmissions,
        List<PracticeAreaRef> practiceAreas) {

    public record PracticeAreaRef(String slug, String name) {
    }

    public static AttorneyDto from(Attorney a) {
        List<PracticeAreaRef> areas = a.getPracticeAreas().stream()
                .filter(PracticeArea::isActive)
                .map(p -> new PracticeAreaRef(p.getSlug(), p.getName()))
                .toList();
        return new AttorneyDto(a.getId(), a.getSlug(), a.getFullName(), a.getTitle(), a.getShortBio(), a.getBio(),
                a.getPhotoUrl(), a.getEducation(), a.getBarAdmissions(), areas);
    }
}
