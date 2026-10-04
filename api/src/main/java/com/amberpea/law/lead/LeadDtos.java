package com.amberpea.law.lead;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public final class LeadDtos {

    private LeadDtos() {
    }

    public record LeadSummary(Long id, String fullName, String email, String phone, String message,
            String practiceAreaSlug, String practiceAreaName, LeadSource source, LeadStatus status,
            Instant createdAt) {

        public static LeadSummary from(Lead l) {
            var pa = l.getPracticeArea();
            return new LeadSummary(l.getId(), l.getFullName(), l.getEmail(), l.getPhone(), l.getMessage(),
                    pa == null ? null : pa.getSlug(), pa == null ? null : pa.getName(), l.getSource(), l.getStatus(),
                    l.getCreatedAt());
        }
    }

    public record StatusUpdate(@NotNull(message = "Status is required") LeadStatus status) {
    }
}
