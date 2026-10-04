package com.amberpea.law.attorney;

import java.util.LinkedHashSet;
import java.util.Set;

import com.amberpea.law.common.Auditable;
import com.amberpea.law.practicearea.PracticeArea;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "attorney")
public class Attorney extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80, unique = true)
    private String slug;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "short_bio", nullable = false, length = 400)
    private String shortBio;

    @Column(nullable = false, columnDefinition = "text")
    private String bio;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(columnDefinition = "text")
    private String education;

    @Column(name = "bar_admissions", columnDefinition = "text")
    private String barAdmissions;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "attorney_practice_area",
            joinColumns = @JoinColumn(name = "attorney_id"),
            inverseJoinColumns = @JoinColumn(name = "practice_area_id"))
    @OrderBy("sortOrder ASC")
    private Set<PracticeArea> practiceAreas = new LinkedHashSet<>();

    protected Attorney() {
    }

    public Long getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getFullName() {
        return fullName;
    }

    public String getTitle() {
        return title;
    }

    public String getShortBio() {
        return shortBio;
    }

    public String getBio() {
        return bio;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public String getEducation() {
        return education;
    }

    public String getBarAdmissions() {
        return barAdmissions;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public Set<PracticeArea> getPracticeAreas() {
        return practiceAreas;
    }
}
