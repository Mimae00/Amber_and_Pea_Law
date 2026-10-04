package com.amberpea.law.admin;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.amberpea.law.common.BadRequestException;
import com.amberpea.law.common.NotFoundException;
import com.amberpea.law.practicearea.PracticeArea;
import com.amberpea.law.practicearea.PracticeAreaRepository;
import com.amberpea.law.review.Review;
import com.amberpea.law.review.ReviewDto;
import com.amberpea.law.review.ReviewRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/reviews")
public class AdminReviewController {

    private final ReviewRepository reviews;
    private final PracticeAreaRepository practiceAreas;

    public AdminReviewController(ReviewRepository reviews, PracticeAreaRepository practiceAreas) {
        this.reviews = reviews;
        this.practiceAreas = practiceAreas;
    }

    public record ReviewRequest(
            @NotBlank(message = "Author name is required") @Size(max = 120) String authorName,
            @NotNull(message = "Rating is required") @Min(value = 1, message = "Rating must be 1 to 5") @Max(value = 5, message = "Rating must be 1 to 5") Integer rating,
            @NotBlank(message = "Review text is required") @Size(max = 4000) String content,
            @Size(max = 80) String practiceAreaSlug,
            @NotNull(message = "Date is required") @PastOrPresent(message = "Date cannot be in the future") LocalDate reviewDate,
            boolean published) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReviewDto> list() {
        return reviews.findAllByOrderByReviewDateDescIdDesc().stream().map(ReviewDto::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ReviewDto create(@Valid @RequestBody ReviewRequest req) {
        Review review = new Review(req.authorName().trim(), req.rating(), req.content().trim(),
                practiceArea(req.practiceAreaSlug()), req.reviewDate(), req.published());
        return ReviewDto.from(reviews.saveAndFlush(review));
    }

    @PutMapping("/{id}")
    @Transactional
    public ReviewDto update(@PathVariable Long id, @Valid @RequestBody ReviewRequest req) {
        Review review = reviews.findById(id).orElseThrow(() -> new NotFoundException("Review not found"));
        review.update(req.authorName().trim(), req.rating(), req.content().trim(), practiceArea(req.practiceAreaSlug()),
                req.reviewDate(), req.published());
        return ReviewDto.from(reviews.saveAndFlush(review));
    }

    private PracticeArea practiceArea(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return practiceAreas.findBySlug(slug.trim())
                .orElseThrow(() -> new BadRequestException("Unknown practice area: " + slug));
    }
}
