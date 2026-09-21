package com.internship.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "risk_records")
@EntityListeners(AuditingEntityListener.class)
public class RiskRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String status;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column
    private String severity;

    @Column
    private String owner;

    @Column(name = "due_date")
    private java.time.LocalDate dueDate;

    @Column(name = "mitigation_plan", length = 2000)
    private String mitigationPlan;

    @Column(nullable = false)
    private Boolean deleted = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getScore() {
        return riskScore;
    }

    public void setScore(Integer score) {
        this.riskScore = score;
        if (this.severity == null && score != null) {
            if (score >= 70) this.severity = "HIGH";
            else if (score >= 40) this.severity = "MEDIUM";
            else this.severity = "LOW";
        }
    }

    public void setRiskScore(Integer riskScore) {
        this.riskScore = riskScore;
        if (this.severity == null && riskScore != null) {
            if (riskScore >= 70) this.severity = "HIGH";
            else if (riskScore >= 40) this.severity = "MEDIUM";
            else this.severity = "LOW";
        }
    }

    public void setSeverity(String severity) {
        this.severity = severity != null ? severity.toUpperCase() : null;
        if (this.riskScore == null && this.severity != null) {
            if ("HIGH".equalsIgnoreCase(this.severity)) this.riskScore = 80;
            else if ("MEDIUM".equalsIgnoreCase(this.severity)) this.riskScore = 50;
            else if ("LOW".equalsIgnoreCase(this.severity)) this.riskScore = 20;
        }
    }

    public LocalDateTime getCreatedDate() {
        return createdAt;
    }

    public String getSeverity() {
        if (severity != null && !severity.isBlank()) {
            return severity.toUpperCase();
        }
        if (riskScore == null) return "LOW";
        if (riskScore >= 70) return "HIGH";
        if (riskScore >= 40) return "MEDIUM";
        return "LOW";
    }
}