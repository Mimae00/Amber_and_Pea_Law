package com.amberpea.law.review;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = "practiceArea")
    List<Review> findByPublishedTrueOrderByReviewDateDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = "practiceArea")
    List<Review> findAllByOrderByReviewDateDescIdDesc();
}
