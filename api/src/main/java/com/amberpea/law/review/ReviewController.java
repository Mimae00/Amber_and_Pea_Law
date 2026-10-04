package com.amberpea.law.review;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@Validated
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository repository;

    public ReviewController(ReviewRepository repository) {
        this.repository = repository;
    }

    /** Published reviews, newest first. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ReviewDto> list(@RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return repository.findByPublishedTrueOrderByReviewDateDescIdDesc(PageRequest.of(0, limit))
                .stream().map(ReviewDto::from).toList();
    }
}
