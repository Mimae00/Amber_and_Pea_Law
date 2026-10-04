package com.amberpea.law.admin;

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

import com.amberpea.law.common.ConflictException;
import com.amberpea.law.common.NotFoundException;
import com.amberpea.law.practicearea.PracticeArea;
import com.amberpea.law.practicearea.PracticeAreaDto;
import com.amberpea.law.practicearea.PracticeAreaRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/practice-areas")
public class AdminPracticeAreaController {

    private final PracticeAreaRepository repository;

    public AdminPracticeAreaController(PracticeAreaRepository repository) {
        this.repository = repository;
    }

    public record PracticeAreaRequest(
            @NotBlank(message = "Slug is required") @Size(max = 80)
            @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$", message = "Use lowercase letters, numbers and single hyphens") String slug,
            @NotBlank(message = "Name is required") @Size(max = 120) String name,
            @NotBlank(message = "Summary is required") @Size(max = 400, message = "Summary must be 400 characters or fewer") String summary,
            @NotBlank(message = "Description is required") @Size(max = 10000) String description,
            @Min(0) @Max(10000) int sortOrder,
            boolean active) {
    }

    /** All practice areas, including inactive ones. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<PracticeAreaDto> list() {
        return repository.findAllByOrderBySortOrderAscNameAsc().stream().map(PracticeAreaDto::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PracticeAreaDto create(@Valid @RequestBody PracticeAreaRequest req) {
        if (repository.existsBySlug(req.slug())) {
            throw new ConflictException("A practice area with this slug already exists");
        }
        PracticeArea area = new PracticeArea(req.slug(), req.name().trim(), req.summary().trim(),
                req.description().trim(), req.sortOrder(), req.active());
        return PracticeAreaDto.from(repository.saveAndFlush(area));
    }

    @PutMapping("/{id}")
    @Transactional
    public PracticeAreaDto update(@PathVariable Long id, @Valid @RequestBody PracticeAreaRequest req) {
        PracticeArea area = repository.findById(id).orElseThrow(() -> new NotFoundException("Practice area not found"));
        if (repository.existsBySlugAndIdNot(req.slug(), id)) {
            throw new ConflictException("A practice area with this slug already exists");
        }
        area.update(req.slug(), req.name().trim(), req.summary().trim(), req.description().trim(), req.sortOrder(),
                req.active());
        return PracticeAreaDto.from(repository.saveAndFlush(area));
    }
}
