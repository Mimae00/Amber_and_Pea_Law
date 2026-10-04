package com.amberpea.law.review;

import java.time.LocalDate;

import com.amberpea.law.common.Auditable;
import com.amberpea.law.practicearea.PracticeArea;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "review")
public class Review extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    @Column(nullable = false)
    private short rating;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_area_id")
    private PracticeArea practiceArea;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(nullable = false)
    private boolean published = true;

    protected Review() {
    }

    public Review(String authorName, int rating, String content, PracticeArea practiceArea, LocalDate reviewDate,
            boolean published) {
        update(authorName, rating, content, practiceArea, reviewDate, published);
    }

    public final void update(String authorName, int rating, String content, PracticeArea practiceArea,
            LocalDate reviewDate, boolean published) {
        this.authorName = authorName;
        this.rating = (short) rating;
        this.content = content;
        this.practiceArea = practiceArea;
        this.reviewDate = reviewDate;
        this.published = published;
    }

    public Long getId() {
        return id;
    }

    public String getAuthorName() {
        return authorName;
    }

    public int getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public PracticeArea getPracticeArea() {
        return practiceArea;
    }

    public LocalDate getReviewDate() {
        return reviewDate;
    }

    public boolean isPublished() {
        return published;
    }
}
