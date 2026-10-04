package com.amberpea.law.practicearea;

import com.amberpea.law.common.Auditable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "practice_area")
public class PracticeArea extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80, unique = true)
    private String slug;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 400)
    private String summary;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    protected PracticeArea() {
    }

    public PracticeArea(String slug, String name, String summary, String description, int sortOrder, boolean active) {
        this.slug = slug;
        this.name = name;
        this.summary = summary;
        this.description = description;
        this.sortOrder = sortOrder;
        this.active = active;
    }

    public void update(String slug, String name, String summary, String description, int sortOrder, boolean active) {
        this.slug = slug;
        this.name = name;
        this.summary = summary;
        this.description = description;
        this.sortOrder = sortOrder;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public String getSummary() {
        return summary;
    }

    public String getDescription() {
        return description;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }
}
