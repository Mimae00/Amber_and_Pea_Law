package com.amberpea.law.lead;

import com.amberpea.law.common.Auditable;
import com.amberpea.law.practicearea.PracticeArea;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "lead")
public class Lead extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(columnDefinition = "text")
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_area_id")
    private PracticeArea practiceArea;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LeadSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeadStatus status = LeadStatus.NEW;

    @Column(nullable = false)
    private boolean consent;

    protected Lead() {
    }

    public Lead(String fullName, String email, String phone, String message, PracticeArea practiceArea,
            LeadSource source, boolean consent) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.message = message;
        this.practiceArea = practiceArea;
        this.source = source;
        this.consent = consent;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getMessage() {
        return message;
    }

    public PracticeArea getPracticeArea() {
        return practiceArea;
    }

    public LeadSource getSource() {
        return source;
    }

    public LeadStatus getStatus() {
        return status;
    }

    public void setStatus(LeadStatus status) {
        this.status = status;
    }

    public boolean isConsent() {
        return consent;
    }
}
